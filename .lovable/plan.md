

# Fix: 82 RLS "Policy Always True" Security Warnings

## What Are These Warnings?

The Supabase Security Advisor flags RLS policies that use `USING (true)` or `WITH CHECK (true)` on INSERT, UPDATE, DELETE, or ALL operations. This means **any user** matching the policy's role can modify **any row** -- there's no row-level filtering.

## Categories of Issues Found

### Category A: CRITICAL -- Policies using `{public}` role with `true` (should be restricted)
These policies are named "Service role full access" but are actually assigned to the `{public}` role, meaning **anyone, even unauthenticated users**, can modify data:

| Table | Policy | Current Role |
|-------|--------|-------------|
| ai_chat_messages | Service role full access | public |
| ai_chat_sessions | Service role full access | public |
| ai_chatbot_knowledge | Service role full access | public |
| inter_bank_transfers | Users can update | public |
| leasing_finance_settings | Users can update | public |
| numbering_sequences | Users can update | public |
| school_ar_invoice_batches | Users can manage | public |
| school_ar_invoices | Users can manage | public |
| school_bus_expense_gl_mappings | Users can update/delete | public |
| school_bus_finance_settings | Users can manage | public |
| school_student_ar_link | Users can manage | public |
| special_hire_finance_settings | Users can update | public |
| vendor_bank_accounts | Users can insert/update/delete | public |

**Fix**: Drop these policies and recreate them for `authenticated` role with `(SELECT auth.uid()) IS NOT NULL`.

### Category B: Authenticated policies with `true` (need proper check)
These restrict to logged-in users but allow any authenticated user to modify any row. While less critical (users must be logged in), the linter still flags them:

~50 policies across: marketing_*, lightvehicle_*, sinotruck_*, yutong_*, expense_requests, document_versions, iou_records, payment_links, payment_reminder_rules, petty_cash_funds, recurring_invoices, scheduled_tasks, workflow_rules, etc.

**Fix**: Replace `true` with `(SELECT auth.uid()) IS NOT NULL`. This is functionally equivalent for `authenticated` role but satisfies the linter and is best practice.

### Category C: Intentional public access (keep as-is, ~8 policies)
These are for public-facing features where anonymous users must interact:
- conductor_submissions INSERT (anon) -- public trip sheet upload
- customer_portal_access UPDATE (anon) -- OTP verification flow
- customer_portal_sessions INSERT (anon) -- portal login
- customer_support_requests INSERT (anon) -- public support form
- special_hire_submissions INSERT (public) -- public hire form

These are **intentionally permissive** and will remain flagged (acceptable).

## Implementation Plan

### Single Database Migration

One migration file that:

1. **Drops and recreates ~15 Category A policies** -- changing role from `public` to `authenticated` and condition from `true` to `(SELECT auth.uid()) IS NOT NULL`

2. **Drops and recreates ~60 Category B policies** -- keeping `authenticated` role but changing condition from `true` to `(SELECT auth.uid()) IS NOT NULL`

3. **Leaves ~8 Category C policies untouched** -- they are intentional

### Expected Result
- Warnings reduced from **82 to ~8** (only the intentional public-facing policies remain)
- No functionality changes for logged-in users (all internal app features work the same)
- Critical security fix for Category A (public role policies that should never have been public)

### No Code Changes Required
All application code uses the Supabase client with authenticated sessions, so changing these policies from `true` to `auth.uid() IS NOT NULL` will not break any existing functionality.

