

# Plan: Fix Remaining Security Findings

## Summary

There are **5 active findings** across two scanners (`supabase_lov` and `agent_security`). I'll fix 4 via a single database migration and mark 1 as already fixed.

## Findings & Fixes

### 1. NIC Exposure in `buses` and `route_permits` (ERROR)
**Problem:** Old `SELECT USING (auth.role() = 'authenticated')` policies from the initial migration were never dropped. The later `FOR ALL` policies (admin/supervisor) exist but the old permissive SELECT still allows any authenticated user to read NIC, owner addresses, and driver phone numbers.

**Fix:** Drop the old permissive SELECT policies:
```sql
DROP POLICY IF EXISTS "All authenticated users can view buses" ON public.buses;
DROP POLICY IF EXISTS "All authenticated users can view permits" ON public.route_permits;
```

### 2. `pending_invites` JWT Claim Bypass (WARN)
**Problem:** A delete policy uses `auth.jwt() ->> 'user_role'` instead of the `has_any_role()` function. The latest migration already replaced this with `has_any_role`, but the old JWT-based "Anon admins can delete invites" policy may still exist.

**Fix:** Drop any remaining JWT-based policy:
```sql
DROP POLICY IF EXISTS "Anon admins can delete invites" ON public.pending_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.pending_invites;
-- Re-create using has_any_role (already covered by "Users with admin roles can manage invites" FOR ALL)
```

### 3. Realtime Channel Data Leak (ERROR)
**Problem:** `special_hire_quotations`, `special_hire_payments`, `special_hire_invoices` are published to Supabase Realtime. Any authenticated user can subscribe to change events. Realtime respects RLS on the underlying tables, so the fix is to ensure those tables have proper role-scoped SELECT policies (they already do via the `has_any_role` migration).

**Fix:** The existing RLS on these tables already filters Realtime broadcasts. I'll verify and mark as mitigated — Supabase Realtime respects table-level RLS policies for row filtering.

### 4. Customer PII Broad Access (ERROR)
**Problem:** `lightvehicle_customers` and `sinotruck_customers` still have old permissive policies (`USING (true)` or `auth.uid() IS NOT NULL`). `yutong_customers` and `customers` were already fixed to admin/finance roles.

**Fix:** Drop old permissive policies on `lightvehicle_customers` and `sinotruck_customers`, leaving only the role-scoped `has_any_role` policies from the Dec 2025 migration:
```sql
DROP POLICY IF EXISTS "Auth select lv_customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Auth insert lv_customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Auth update lv_customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.sinotruck_customers;
```

### 5. Agent Security Unnamed Finding (Payroll/Students/Temp Passwords)
**Problem:** This finding references issues that were already fixed in previous sessions:
- Payroll: restricted to finance/admin roles
- Students: branch-scoped RLS
- Temporary passwords: `plain_password_display` column already dropped
- Profiles: restricted to self/admin

**Fix:** Mark as fixed with explanation.

## Files Changed

| What | Action |
|------|--------|
| **DB Migration** | Single SQL migration dropping ~7 stale permissive policies |
| **Security Findings** | Mark fixed/mitigated via `manage_security_finding` |

No frontend code changes needed — this is purely database policy cleanup.

