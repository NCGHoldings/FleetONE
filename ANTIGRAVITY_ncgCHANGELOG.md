# 🚀 Antigravity External Development Changelog

> **Purpose:** This file documents all changes made by **Antigravity** (external AI development tool).
> Lovable should read this file before any development to avoid duplicating or conflicting with these changes.
>
> **Last Updated:** 2026-02-18

---

## 2026-02-18

### 🔍 Special Hire System Audit — 3 GL Gap Fixes

**Audit Scope:** 67 components, 17 hooks across the entire Special Hire financial system.

**Critical GL Gaps Fixed:**

- **Post-Trip Adjustment GL:** `PostTripAdjustmentModal.handleFinalize` now posts DR Trade Receivable / CR Revenue via new `postPostTripAdjustmentToGLStandalone` (extra KM, time, expenses were previously invisible to GL)
- **Enhanced Status Modal Refund GL:** `EnhancedTripStatusManagementModal.handleSubmit` now posts DR Customer Advance / CR Bank via `postRefundToGLStandalone` (the basic modal had this, the enhanced version didn't)
- **Discount GL Posting:** `GenerateBalanceInvoiceModal.handleEmailToCustomer` now posts DR Discount Expense / CR Trade Receivable via new `postDiscountToGLStandalone` (discount hook existed but was never called from UI)

**Accounting Fix:** Invoice GL now posts **gross** amount before discount, with a separate discount entry (previously netted before posting).

**New Standalone Functions (useSpecialHireFinance.ts):**

- `postPostTripAdjustmentToGLStandalone` — DR Trade Receivable / CR Revenue
- `postDiscountToGLStandalone` — DR Discount Expense / CR Trade Receivable

---

### 🚀 Advanced Finance Automation — 4 GL Fixes + Automation Engine

**Critical GL Integration Fixes (useAccountingMutations.ts):**

- **AR Invoices:** `useCreateARInvoice` now auto-posts DR Trade Receivable / CR Sales Revenue via `postARInvoiceToGL`
- **AP Invoice Approval:** `useApproveAPInvoice` now auto-posts DR Expense / CR Trade Payable via `postAPInvoiceToGL`
- **Recurring Entries:** `useRunRecurringEntry` now creates real journal entries via `createAndPostJournalEntry` (was only updating `last_run_date`)
- **Fund Transfers:** `useCreateFundTransfer` now posts DR/CR to respective bank accounts

**New Files Created:**

- `src/hooks/useFinanceAutomationEngine.ts` — 6 hooks: overdue entry detection, batch execution, GL balance health check, discrepancy fix, recent auto-posts, module health monitoring
- `src/components/accounting/FinanceAutomationDashboard.tsx` — Command-center: module health status, overdue entry runner, GL balance checker, recent post log

**Modified:**

- `src/pages/Accounting.tsx` — Added "Automation Engine" tab as default in Automation module

---

### ✅ Finance Integration Hooks — 6 New GL Posting Modules

**Files Created:**

- `src/hooks/usePayrollFinance.ts` — **[NEW]** GL posting for payroll batches (DR Salary/Overtime/Bonus Expense, CR PAYE/EPF/ETF Payable, CR Bank). Supports salary, overtime, bonuses, statutory deductions.
- `src/hooks/useCommissionFinance.ts` — **[NEW]** GL posting for commission payouts (DR Commission Expense / CR Bank). Handles bank balance updates and bank transaction records.
- `src/hooks/useMaintenanceFinance.ts` — **[NEW]** GL posting for vehicle maintenance costs (DR Maintenance Expense / CR Bank or AP). Supports parts/labor cost splitting and AP invoice creation for credit purchases.
- `src/hooks/useInsuranceFinance.ts` — **[NEW]** GL posting for insurance: premium payments (DR Prepaid Insurance / CR Bank), monthly amortization (DR Insurance Expense / CR Prepaid Insurance), and claim recoveries (DR Claims Receivable / CR Claims Income).
- `src/hooks/useExpenseRequestFinance.ts` — **[NEW]** GL posting for approved expense requests (DR Expense / CR Bank/Cash/AP). Maps expense categories to GL accounts. Supports petty cash, bank, IOU, and AP payment methods.
- `src/hooks/useRoutePermitFinance.ts` — **[NEW]** GL posting for route permits (DR Permit Expense or Prepaid / CR Bank). Distinguishes annual (capitalize + amortize) vs temporary (expense immediately) permits.
- `supabase/migrations/20260218_create_module_finance_settings.sql` — **[NEW]** Creates `module_finance_settings` table for per-module GL account mappings. Adds `gl_posted` and `journal_entry_id` columns to `asset_maintenance_logs` and `expense_requests`.

### ✅ Finance Hooks — UI Wiring (GL Posting Triggers)

**Files Modified:**

- `src/pages/StaffAttendancePayroll.tsx` — Added "Post to GL" button on payroll batches. Added "Pay & Post to GL" button for approved commissions.
- `src/components/accounting/assets/AssetMaintenanceView.tsx` — Auto-posts maintenance cost to GL on completion. Added GL status column and manual "Post GL" button for completed entries.
- `src/components/accounting/ExpenseReviewView.tsx` — Auto-posts to GL on expense approval. Added GL status column and manual "Post GL" button. Uses `ExpenseRequestForGL` interface with `settings` + `mappings` params.
- `src/pages/RoutePermits.tsx` — Auto-posts permit cost to GL when `annual_fee > 0`. Distinguishes annual (>90 days, 12-month coverage) vs temporary permits.
- `src/components/accident/AccidentDetailsModal.tsx` — Auto-posts insurance claim recovery to GL when status changes to Approved/Settlement with approved_amount > 0.

**Architecture Notes:**

- All 6 hooks follow the same pattern: fetch/save per-module settings from `module_finance_settings`, create journal entries with double-entry lines, update COA balances, update bank balances, create bank transactions
- GL account mappings are configuration-driven via `module_finance_settings` (JSONB `settings` column, keyed by `company_id` + `module_name`)
- No existing hook files were modified — zero regression risk

### ✅ Module GL Mappings — Admin Settings UI

**Files Created / Modified:**

- `src/components/settings/ModuleFinanceSettingsView.tsx` — **[NEW]** Unified admin UI with accordion panels for all 6 finance modules (Payroll, Commissions, Maintenance, Insurance, Expense Requests, Route Permits). Each panel has searchable GL account selectors, auto-post toggles, JE prefix config, and per-module save. Expense Requests also supports dynamic category-to-GL mappings.
- `src/pages/Settings.tsx` — Added "Module GL Mappings" tab to the Settings page.

### ✅ Finance Automation Audit — Auto-Post Toggle Gate Fixes

All 6 new finance modules now properly respect their auto-post toggle settings:

**Files Modified:**

- `src/components/accounting/assets/AssetMaintenanceView.tsx` — GL post now gated behind `auto_post_on_complete` toggle
- `src/components/accounting/ExpenseReviewView.tsx` — GL post now gated behind `auto_post_on_approve` toggle
- `src/pages/RoutePermits.tsx` — GL post now gated behind `auto_post_on_renewal` toggle
- `src/components/accident/AccidentDetailsModal.tsx` — GL post now gated behind `auto_post_premium` toggle
- `src/pages/StaffAttendancePayroll.tsx` — Added auto-post after payroll generation (`auto_post_on_process`) and after commission bulk approval (`auto_post_on_paid`)

---

## 2026-02-17

### ✅ Budget Section — Company-Wise Filtering & GL-Linked Actuals

**Files Modified:**

- `src/components/budgeting/BudgetDashboard.tsx` — Added `useCompany()` context for company-wise filtering. All queries (budgets, line items, GL entries, expense accounts) now filter by `effectiveCompanyId` with proper cache key invalidation.
- `src/components/budgeting/BudgetAnalytics.tsx` — Added `useCompany()` context for company-wise filtering on all queries. Added `glAccountSpending` map that computes actual spending from GL journal entry lines per COA account. Category analysis and top variances now use GL-derived actuals when `account_id` is linked to a budget line item, falling back to manual `actual_amount` otherwise.

**Architecture Notes:**

- Both components follow the same pattern as `FinancialStatementsView`: `useCompany()` → `getEffectiveCompanyId()` → `.eq("company_id", ...)` on queries
- GL-linked actuals: `budget_line_items.account_id` → matches `journal_entry_lines.account_id` → sums `debit - credit` for expense accounts within fiscal year
- Queries re-fetch automatically when company changes via `queryKey` including `effectiveCompanyId`

### ✅ P&L and Balance Sheet — Journal-Entry-Based Rebuild

**Files Modified:**

- `src/components/accounting/FinancialStatementsView.tsx` — **Major rewrite:** Rebuilt Profit & Loss and Balance Sheet reports to calculate figures from `journal_entry_lines` instead of aggregating raw transaction tables. Added date-range filtering for P&L and point-in-time reporting for Balance Sheet. Implemented PDF export for both financial statements using browser print API. Added export toolbar with PDF download button.

### ✅ Budget Dashboard YTD Fix & Budget Analytics Tab

**Files Modified:**

- `src/components/budgeting/BudgetDashboard.tsx` — Fixed YTD actual spending calculation to correctly sum from journal entries within the budget period. Rebuilt variance analysis to compare budgeted vs. actual (journal-entry-derived) amounts. Added Budget Analytics tab with visual charts for budget vs. actual comparison, category breakdowns, and trend analysis.
- `src/pages/Budgeting.tsx` — Updated tab navigation to include new Budget Analytics tab.

### 🔧 Minor Fixes (Auto-Numbering & Cash Flow)

**Files Modified:**

- `src/components/accounting/ARInvoiceForm.tsx` — Minor fix for auto-numbering integration
- `src/components/accounting/JournalEntryForm.tsx` — Minor fix for auto-numbering integration
- `src/components/accounting/CustomerMasterView.tsx` — Minor UI adjustments
- `src/components/accounting/VendorMasterView.tsx` — Minor UI adjustments
- `src/hooks/useCashFlowData.ts` — Minor cash flow reconciliation fix

---

## 2026-02-16

### ✅ Bank Reconciliation — SAP B1-Style Rewrite

**Files Modified / Created:**

- `src/hooks/useAccountingData.ts` — Added `useLastReconciliation` hook (fetches last completed reconciliation for "Last Statement Balance" carry-forward)
- `src/hooks/useAccountingMutations.ts` — Added `useSaveBankReconciliation` mutation (creates reconciliation record + items, marks transactions as reconciled in `bank_transactions`)
- `src/components/accounting/BankReconciliationWorksheet.tsx` — **Full rewrite:** SAP B1-style unified transaction table with ☑ Cleared checkboxes, Type badges (DP/PS/FT/FC/IN), editable Cleared Amount, Payment/Deposit columns, Select All, Display filter (All/Not Cleared/Cleared), Statement No., Statement Date, Statement Ending Balance, Last Statement Balance, bottom summary bar (Payment/Deposit totals + Cleared Book Balance + Statement Ending Balance + Difference ✓/⚠), Save/Cancel/Adjustments buttons, Adjustments dialog
- `src/components/accounting/BankReconciliationWorksheet.css` — **[NEW]** External CSS for all worksheet styles (no inline styles)

**Architecture Notes:**

- Single unified table replaces old side-by-side view — matches SAP B1 reconciliation UX
- Reconciliation save flow: creates `bank_reconciliations` header → `bank_reconciliation_items` per cleared transaction → updates `bank_transactions.is_reconciled`
- Last Statement Balance auto-loads from most recent completed reconciliation

### ✅ School Bus Payment Balance → COA Liability Integration

**Files Modified:**

- `src/hooks/useSchoolBusFinance.ts` — Added `advance_payments_liability_account_id` to interface and sanitizer. Modified `usePostPaymentToGL` to split credits for overpayments (DR Bank / CR Trade Receivables + CR Advance Payments Liability). Updated `useGenerateBulkARInvoices` to auto-apply student advance balances with reverse liability GL entries (DR Advance Liability / CR Trade Receivables).
- `src/components/school/RecordPaymentModal.tsx` — Passes `fixedAmount` and `overpaymentAmount` to GL posting. Shows COA liability note when student overpays.
- `src/components/school/SchoolBusFinanceSettings.tsx` — Added "Advance Payments Liability Account" selector (filtered to liability-type COA accounts). Added Journal Entry Preview card for advance balance postings (overpayment + monthly auto-apply).

**DB Migration Required:** `ALTER TABLE school_bus_finance_settings ADD COLUMN advance_payments_liability_account_id UUID REFERENCES chart_of_accounts(id);`

### 🔧 Overpayment GL Posting Fix — Setting Not Persisting + Wrong Calculation

**Files Modified:**

- `src/integrations/supabase/types.ts` — Added `advance_payments_liability_account_id` to Row/Insert/Update types for `school_bus_finance_settings`
- `src/hooks/useSchoolBusFinance.ts` — Added `patchLiabilityAccount` direct REST API fallback (bypasses PostgREST schema cache). Added error-based save fallback in `useUpdateSchoolBusFinanceSettings`. Removed `Record<string, unknown>` cast in `usePostPaymentToGL`.
- `src/components/school/SchoolBusFinanceSettings.tsx` — Removed `Record<string, unknown>` cast for loading settings
- `src/components/school/RecordPaymentModal.tsx` — Fixed overpayment calculation: `receivedAmount > amountDue` instead of `newBalance > 0`

**Issues Fixed:**

1. PostgREST schema cache not recognizing newly-added column → direct REST API PATCH fallback
2. Overpayment amount calculation used cumulative balance check instead of direct comparison

**Architecture Notes:**

- Double-entry bookkeeping: overpayments credited to liability, auto-debited when next month's invoices are generated
- IAS/IFRS compliant customer prepayment handling
- Follows existing consolidated GL pattern (NCG Holding hierarchy)

### ✅ COA Inline Add Child Row Feature

**Files Modified:**

- `src/components/accounting/ChartOfAccountsTree.tsx` — Added `[+]` button on every tree row (folder nodes and leaf accounts). Clicking opens an inline form row with auto-suggested account code (based on sibling numbering patterns), inherited account type, and editable fields. Saves via `useCompanyCreateAccount` with proper level1-5 derivation. Added `parent_account_id` to Account interface.
- `src/components/accounting/ChartOfAccountsView.tsx` — Passes `allAccounts` and `onAccountCreated={refetch}` props to `ChartOfAccountsTree`.

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

### Module Finance Settings (GL Account Mappings)

- Table: `module_finance_settings` — stores per-module GL account configurations
- Key columns: `company_id`, `module_name` (unique together), `settings` (JSONB)
- Module names: `payroll`, `commissions`, `maintenance`, `insurance`, `expense_requests`, `route_permits`
- Each hook reads/writes settings from this table using the same pattern
- Related columns added: `asset_maintenance_logs.gl_posted`, `asset_maintenance_logs.journal_entry_id`, `expense_requests.gl_posted`, `expense_requests.journal_entry_id`
