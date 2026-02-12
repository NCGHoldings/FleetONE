# 🚀 Antigravity External Development Changelog

> **Purpose:** This file documents all changes made by **Antigravity** (external AI development tool).
> Lovable should read this file before any development to avoid duplicating or conflicting with these changes.
> 
> **Last Updated:** 2026-02-12

---

## 2026-02-12

### ✨ Per-Bus-Type Breakdowns in CostBreakdown (Multi-Bus Fleet)
**Files Modified:**
- `src/components/special-hire/SpecialHireForm.tsx` — `busFleetDetails` entries now include per-bus-type fields: `fixed_rate_per_bus`, `overtime_charge_per_bus`, `overnight_charge_per_bus`, `exceeding_charge_per_bus`, `bus_type_efficiency`, `fuel_liters_per_bus`.
- `src/components/special-hire/CostBreakdown.tsx` — When a quotation has **different** bus types, the Hire Charges Breakdown, Extra Time Charges, and Deductions (Fuel & Maintenance) sections now render **separate per-bus-type cards** instead of merged/averaged values. Same-type fleets still display merged. Working Hours Analysis remains shared.

**Trigger:** `hasMultipleBusTypes = new Set(buses.map(b => b.bus_type_name)).size > 1`

---

### 🐛 Fix Multi-Bus Category Totals — Fuel Double-Counting & Display
**Files Modified:**
- `src/components/special-hire/SpecialHireForm.tsx` — `calculateMultiBusFleetCosts`: `grossRevenue` now stores hire charges only (was `combinedSubtotal` which included fuel+maintenance). Fuel added explicitly to `preCommissionTotal`. `setCostData` now includes all missing display fields (hireCharge, fixedRate, overtime, overnight, pickupDateTime, dropDateTime, busTypeEfficiency, fuelPricePerLiter, maintenanceRatePerKm, etc.).
- `src/components/special-hire/QuotationPreview.tsx` — Per-bus "Total Cost" column now shows `hire_charge_per_bus × quantity` (was `subtotal_all_buses` which bundled internal fuel+maintenance costs).
- `src/components/special-hire/CostBreakdown.tsx` — Multi-bus fuel/maintenance calculations now use stored per-bus-type values instead of recalculating with single busTypeEfficiency. Fixes 1-rupee rounding errors and incorrect totals for mixed bus types.
**Root Cause:** Multi-bus `grossRevenue` included fuel+maintenance, but `QuotationPreview.calculateFinalCustomerTotal()` added `fuel_cost_fuel_only` again → fuel double-counted. CostBreakdown recalculated fuel using one bus type's efficiency for all types → wrong amounts.

### 🔍 Finance & Operations Full Audit (commit: `9f7bee7`)
**Audit Result:** All 13 finance modules (92 sub-tabs) have components present and working. No missing features found in the local codebase.
**Critical Finding:** The staging deployment has a Lovable-generated page at `/accounting/advances/receipts` referencing a non-existent `advance_receipts` table. **This table does NOT exist in Supabase.** The correct implementation uses `ar_receipts` with `is_advance: true` flag. Re-deploying from `main` fixes this.

### ✅ GL Journal Entry Line Details (commit: `9e28926`)
**Files Modified:**
- `src/hooks/useAccountingData.ts` — Fixed `useJournalEntryLines` hook: changed `.order('line_number')` to `.order('debit', { ascending: false })` since `line_number` column doesn't exist. Used explicit FK alias `chart_of_accounts:account_id`.
- `src/components/accounting/JournalEntryDetailDialog.tsx` — Enhanced Entry Lines display: account code on first line, account name below, debit in green, credit in blue. Added empty state fallback.

### ✅ NCG Express GL Auto-Posting (commits: `09f5494`)
**Files Modified:**
- `src/hooks/useNCGExpressFinance.ts` — Added two new exported functions:
  - `autoPostTripIfEnabled(tripId)` — Checks `ncg_express_finance_settings.auto_post_revenue`, fetches trip, calls `postTripRevenueToGL` if enabled.
  - `autoPostExpenseIfEnabled(busId, date)` — Checks `ncg_express_finance_settings.auto_post_expenses`, fetches expense, calls `postExpensesToGL` if enabled.
- `src/components/trips/InlineRevenueEditor.tsx` — Calls `autoPostTripIfEnabled` after saving trip revenue.
- `src/components/trips/InlineExpenseEditor.tsx` — Calls `autoPostExpenseIfEnabled` after saving expenses.
- `src/components/trips/AddTripForm.tsx` — Changed insert to return trip ID via `.select('id').single()`. Calls `autoPostTripIfEnabled` after creating new trip.
- `src/components/trips/QuickEntryPanel.tsx` — Calls `autoPostTripIfEnabled` after updating trip income/expenses.

### ✅ NCG Express Dropdown Fix (commit: `956c3d9`)
**Files Modified:**
- `src/hooks/useNCGExpressFinance.ts` — Removed `account_type` filter from COA dropdown queries in the NCG Express account mapping settings. All chart of accounts now appear in dropdowns regardless of type.

### ✅ COA Transaction Drill-Down for All Levels (commit: `7c81ec5`)
**Files Modified:**
- `src/components/accounting/ChartOfAccountsTree.tsx` — Enabled "View Transactions" action button for all COA hierarchy levels (1-5), not just level 5 leaf accounts.

### ✅ SpecialHireForm ESLint Fixes (commit: `de202b5`)
**Files Modified:**
- `src/components/special-hire/SpecialHireForm.tsx` — Fixed 31 ESLint errors (unused vars, missing types, any types).

---

## Key Architecture Notes for Lovable

### NCG Express Finance Settings
- Table: `ncg_express_finance_settings`
- Key flags: `auto_post_revenue`, `auto_post_expenses`
- When enabled, trips/expenses auto-post to GL on save (non-blocking)
- Settings hook: `useNCGExpressFinance.ts`

### GL Posting Flow
- Revenue: `DR Cash/Bank | CR Ticket Revenue` → via `postTripRevenueToGL()`
- Expenses: `DR Expense Account | CR Cash/Bank` → via `postExpensesToGL()`
- Auto-posting functions are standalone async utilities, NOT React hooks

### Journal Entry Lines
- Table: `journal_entry_lines` — does NOT have `line_number` column
- FK: `account_id` → `chart_of_accounts`
- Query must use `chart_of_accounts:account_id (...)` for reliable joins

### Important Constants
- `NCG_EXPRESS_COMPANY_ID`: `'7ece7595-8b7b-46de-8bfc-c1e8e0da7513'`
- `BUSINESS_UNIT_CODE`: `'NCGE'`

### ⚠️ AR Receipts & Advances (CRITICAL)
- **DO NOT** create or reference an `advance_receipts` table — it does NOT exist
- Advances are stored in `ar_receipts` table with `is_advance: true`
- Mutation: `useCreateARReceipt` in `useAccountingMutations.ts`
- UI: `ARReceiptForm.tsx` with `isAdvanceMode` prop
- Allocations: `ar_receipt_allocations` table links receipts to invoices

