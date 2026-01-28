
# Fix: Page Access Not Working

## Problem Summary

Pages are showing even when you don't grant page access. This happens because the permission system has a bug that prevents it from loading permissions correctly.

## Root Cause Analysis

There are two issues in the `usePagePermissions` hook:

### Issue 1: Permissions Never Loaded for Current User
When the sidebar checks "does this user have access to this page?", it calls `usePagePermissions()` without passing a user ID. The hook then skips loading any permissions because of this code:

```
if (!targetUserId) return;  // Skips fetching!
```

Result: The permissions map stays empty, so the system doesn't know what access was granted or denied.

### Issue 2: Empty Permissions = Default Allow for Management Roles
When permissions are empty, the logic defaults to "allow" for management roles (admin, supervisor, finance, super_admin):

| Role | Empty Permissions Result |
|------|-------------------------|
| super_admin | Always allowed (bypasses everything) |
| admin/supervisor/finance | Allowed (defaults to true) |
| staff/driver | Denied (zero-trust) |

This is why abisheka fernando sees all pages - they have the `super_admin` role.

## Solution

The `usePagePermissions` hook needs to fetch the **current user's** permissions when no `targetUserId` is provided. This requires getting the current user's ID from the auth context and fetching their permissions.

### Changes Required

**File: `src/hooks/usePagePermissions.ts`**

1. Import and use `user` from the `useAuth` hook
2. Determine the effective user ID: use `targetUserId` if provided, otherwise use the current logged-in user's ID
3. Fetch permissions for the effective user ID
4. Only apply super_admin bypass when there's no explicit permission entry

### Updated Logic Flow

```text
1. Sidebar renders
2. usePagePermissions() called (no targetUserId)
3. Hook detects no targetUserId, uses current user's ID instead
4. Fetches permissions from user_page_permissions table
5. hasAccess() checks:
   - If super_admin: return true (bypass all)
   - If explicit permission exists: use that value
   - If management role + no explicit permission: return true (default allow)
   - Otherwise: return false (zero-trust)
```

### Code Changes

```typescript
// src/hooks/usePagePermissions.ts

export function usePagePermissions(targetUserId?: string) {
  const { hasRole, user } = useAuth();  // Add user
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isSuperAdmin = hasRole('super_admin');
  
  // Use targetUserId if provided, otherwise use current user's ID
  const effectiveUserId = targetUserId ?? user?.id;
  const isCheckingOwnAccess = !targetUserId;

  const fetchPermissions = useCallback(async () => {
    if (!effectiveUserId) return;  // Now fetches for current user too
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("user_page_permissions")
      .select("page_identifier, has_access")
      .eq("user_id", effectiveUserId);

    // ... rest of fetch logic
  }, [effectiveUserId]);

  const hasAccess = useCallback(
    (pageId: string) => {
      // Super admins bypass all page restrictions
      if (isSuperAdmin && isCheckingOwnAccess) {
        return true;
      }
      
      const value = permissions[pageId];
      
      // If explicit permission exists, use it
      if (value !== undefined) {
        return value;
      }
      
      // Management roles get default access when no explicit permission
      const hasManagementRole = hasRole('admin') || hasRole('supervisor') || hasRole('finance');
      if (hasManagementRole && isCheckingOwnAccess) {
        return true;
      }
      
      // Zero-Trust: Deny by default for other roles
      return false;
    },
    [permissions, isSuperAdmin, isCheckingOwnAccess, hasRole]
  );

  // ... rest of hook
}
```

## Important Note About Super Admin

The user "abisheka fernando" has the `super_admin` role. Super admins are designed to bypass all page restrictions. If you want to test page access:

1. **Test with a non-super_admin user** - Create a test user with only "staff" role and configure their page access
2. **Or temporarily remove super_admin role** - But this is not recommended for production users

## Testing After Fix

1. Create a test user with "staff" role only
2. Set specific page access for them (e.g., only Dashboard and Fleet Management)
3. Log in as that test user
4. Verify only the granted pages appear in the sidebar

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePagePermissions.ts` | Fetch current user's permissions; fix access logic |
