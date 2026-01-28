
# Fix: Page Access Not Saving Properly

## Problem Summary

When you remove page access from a user (uncheck pages in the Page Access modal), the user can still see those pages in their sidebar. This happens because:

1. **Pages without database entries appear unchecked but are not saved**
2. **The sidebar uses role-based fallback for missing entries**

## Root Cause Analysis

### Issue 1: Pages Not Being Saved to Database

When the Page Access modal opens:
- It fetches existing permissions from the database
- Pages WITH entries appear checked/unchecked based on `has_access` value
- Pages WITHOUT entries appear unchecked (because `isCheckingOwnAccess = false` in the modal)

But when you save:
- Only pages that are IN the `permissions` state object get saved
- Pages that were never clicked/toggled are NOT in the state
- Result: Pages like Light Vehicle and Sinotruck were never saved as `has_access: false`

### Issue 2: Sidebar Role-Based Fallback

When a user views the sidebar:
- The hook checks if the page exists in their permissions
- If NO entry exists, it falls back to role-based defaults
- Supervisor is a "management role" so default = allow
- Result: User sees all pages that have no database entry

### Database Evidence

User `abisheka fernando` has:
- `has_access: false` for Yutong pages (these WERE toggled and saved)
- NO ENTRIES for Light Vehicle and Sinotruck pages
- Since no entries exist, sidebar defaults to "allow" for supervisor

## Solution

### Fix 1: Initialize ALL Pages in Modal

When the modal opens, we need to initialize the `permissions` state with ALL pages from the PAGES definition, not just the ones in the database. This ensures that when you save, all pages are included.

**File: `src/hooks/usePagePermissions.ts`**

Change the `fetchPermissions` function to:
1. First fetch existing permissions from database
2. Then merge with ALL pages, defaulting to `false` for pages not in DB

### Fix 2: Remove Role-Based Fallback for hasAccess

The current logic has a "management role = default allow" fallback. This defeats the purpose of explicit access control. We should change it to:

- If explicit permission exists in DB = use it
- If NO permission exists = deny (zero-trust for everyone)
- Exception: Super Admin bypass only when no explicit entry exists

This ensures that if you don't explicitly grant a page, users cannot access it.

## Implementation Details

### Step 1: Update usePagePermissions Hook

```typescript
// src/hooks/usePagePermissions.ts

import { ALL_PAGES_FLAT } from "@/lib/pages";

const fetchPermissions = useCallback(async () => {
  if (!effectiveUserId) return;
  setLoading(true);
  setError(null);
  
  const { data, error } = await supabase
    .from("user_page_permissions")
    .select("page_identifier, has_access")
    .eq("user_id", effectiveUserId);

  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }

  // Start with all pages defaulting to false
  const map: PermissionMap = {};
  ALL_PAGES_FLAT.forEach((page) => {
    map[page.id] = false; // Default: no access
  });
  
  // Override with actual permissions from database
  (data || []).forEach((row: any) => {
    map[row.page_identifier] = row.has_access;
  });
  
  setPermissions(map);
  setLoading(false);
}, [effectiveUserId]);
```

### Step 2: Simplify hasAccess Logic

```typescript
const hasAccess = useCallback(
  (pageId: string) => {
    const value = permissions[pageId];
    
    // If explicit permission exists, use it
    if (value !== undefined) {
      return value;
    }
    
    // No permission entry - only super_admin gets default access
    if (isSuperAdmin && isCheckingOwnAccess) {
      return true;
    }
    
    // Zero-Trust: Deny by default for everyone else
    return false;
  },
  [permissions, isSuperAdmin, isCheckingOwnAccess]
);
```

## Logic Flow After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Page in DB with `has_access: true` | Allowed | Allowed |
| Page in DB with `has_access: false` | Denied | Denied |
| Page NOT in DB + super_admin | Allowed | Allowed |
| Page NOT in DB + supervisor | **Allowed (bug)** | **Denied (fixed)** |
| Page NOT in DB + staff | Denied | Denied |

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePagePermissions.ts` | Initialize all pages; remove management role fallback |

## Testing Steps

1. Open Staff Management
2. Open Page Access for `abisheka fernando`
3. Notice ALL pages now show with explicit checked/unchecked state
4. Uncheck Light Vehicle and Sinotruck sections
5. Save
6. Log in as that user
7. Verify those pages are hidden

## Important Behavior Change

After this fix, supervisors will no longer have "default access" to pages. You will need to:

1. Grant explicit page access for each supervisor
2. Use "Select All" to quickly grant access to entire categories
3. Save permissions for each user

This is a more secure approach following the zero-trust principle.
