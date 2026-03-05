

# Full System Cross-Check: Guard, Monitor, and Protect

## Critical Finding: `gl_settings` table does not exist

The most critical issue: the `gl_settings` table referenced by 5+ files across the system **does not exist in the database**. Every query to it silently fails, causing:
- GL Integrity Scanner audit score to always report 0% Configuration
- Core GL Settings page to never load/save settings
- AR/AP posting logic to skip GL account lookups
- Automation Engine module health to always show "warning" for Core GL

## All Issues Found

### 1. Missing `gl_settings` table (CRITICAL)
**Files affected**: `useGLIntegrityScanner.ts`, `useFinanceAutomationEngine.ts`, `CoreGLSettings.tsx`, `useAccountingMutations.ts`, `useCustomerCategories.ts`

**Fix**: Create the `gl_settings` table via SQL migration with columns: `id`, `company_id` (unique), `trade_receivable_account_id`, `trade_payable_account_id`, `sales_revenue_account_id`, `default_expense_account_id`, `customer_advance_account_id`, `wht_payable_account_id`, `bank_account_id`, `expense_account_id`, `created_at`, `updated_at` — all FK references to `chart_of_accounts`.

### 2. `light_vehicle_finance_settings` table name wrong
**File**: `useFinanceAutomationEngine.ts` line 496
**Wrong**: `light_vehicle_finance_settings`
**Correct**: `lightvehicle_finance_settings`

### 3. `maintenance_records.vehicle_id` column doesn't exist
**File**: `useCrossModuleChecks.ts` line 141
**Wrong**: `.is('vehicle_id', null)`
**Correct**: `.is('bus_id', null)`

### 4. `bus_loan_payments` refColumn should use `payment_number`
**File**: `useGLIntegrityScanner.ts` line 218
**Current**: `refColumn: "id"` — shows raw UUIDs in gap reports
**Better**: `refColumn: "payment_number"` — shows human-readable references

### 5. Post-gap update logic missing `gl_posted` for `bus_loan_payments`
**File**: `useGLIntegrityScanner.ts` lines 705-710 and 768-773
The post-gap logic only sets `gl_posted = true` for `asset_maintenance_logs` and `expense_requests`. But `bus_loan_payments` also has a `gl_posted` column that should be updated.

**Fix**: Add `bus_loan_payments` to the condition that sets `gl_posted = true`.

## Plan Summary

| File | Change |
|---|---|
| SQL Migration | Create `gl_settings` table with RLS |
| `useFinanceAutomationEngine.ts` | Fix `light_vehicle_finance_settings` → `lightvehicle_finance_settings` |
| `useCrossModuleChecks.ts` | Fix `vehicle_id` → `bus_id` |
| `useGLIntegrityScanner.ts` | Fix `bus_loan_payments` refColumn to `payment_number`; add `bus_loan_payments` to `gl_posted` update logic |

These 5 fixes will eliminate all remaining silent failures and ensure the full guard/monitor system works correctly across all modules.

