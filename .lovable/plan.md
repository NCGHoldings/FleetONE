
# Fix: Page Access Not Respecting Explicit Denials for Super Admins

## Problem Summary

The user `abiwork12345@gmail.com` has pages explicitly set to `has_access: false` in the database, but they can still see all pages because they have the `super_admin` role.

## Root Cause

The current code in `usePagePermissions.ts` line 49-52 immediately returns `true` for super_admins before checking any database permissions:

```typescript
if (isSuperAdmin && isCheckingOwnAccess) {
  return true;  // Bypasses all permission checks!
}
```

## Database Evidence

User `82b15c32-1b42-4740-bc3b-2e9f6603e875` (abiwork12345@gmail.com):
- Role: `super_admin`
- Has explicit `has_access: false` for pages like:
  - `governance_calendar`
  - `governance_holidays`
  - `nsp_daily_sales`
  - `nsp_summary`
  - `yutong_addons`
  - `yutong_bus_models`
  - etc.

But these explicit denials are ignored because of the super_admin bypass.

## Solution

Change the logic so that:
1. **If explicit permission exists in database**, use that value (even for super_admin)
2. **If NO explicit permission exists**, then super_admin gets default access

This way:
- You can explicitly deny pages to super_admins
- Super_admins still get access to pages that have no explicit setting

## Code Changes

**File: `src/hooks/usePagePermissions.ts`**

Update the `hasAccess` function to check explicit permissions FIRST:

```typescript
const hasAccess = useCallback(
  (pageId: string) => {
    const value = permissions[pageId];
    
    // If explicit permission exists in database, always use it
    // This allows denying access even to super_admins
    if (value !== undefined) {
      return value;
    }
    
    // No explicit permission set - apply role-based defaults
    
    // Super admins get default access when no explicit permission
    if (isSuperAdmin && isCheckingOwnAccess) {
      return true;
    }
    
    // Management roles get default access when no explicit permission set
    const hasManagementRole = hasRole('admin') || hasRole('supervisor') || hasRole('finance');
    if (hasManagementRole && isCheckingOwnAccess) {
      return true;
    }
    
    // Zero-Trust: Deny by default for other roles
    return false;
  },
  [permissions, isSuperAdmin, isCheckingOwnAccess, hasRole]
);
```

## Logic Flow After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Super admin, `has_access: true` | Allowed | Allowed |
| Super admin, `has_access: false` | Allowed (bug) | **Denied** (fixed) |
| Super admin, no entry | Allowed | Allowed |
| Admin, `has_access: true` | Allowed | Allowed |
| Admin, `has_access: false` | Denied | Denied |
| Admin, no entry | Allowed | Allowed |
| Staff, `has_access: true` | Allowed | Allowed |
| Staff, `has_access: false` | Denied | Denied |
| Staff, no entry | Denied | Denied |

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePagePermissions.ts` | Reorder `hasAccess` logic to check explicit permissions first |

## Testing Steps

1. Open Staff Management
2. Find user `abiwork12345@gmail.com`
3. Open their Page Access
4. Verify some pages are unchecked (e.g., Yutong pages, NSP pages)
5. Log in as that user
6. Confirm those pages are now hidden from sidebar
