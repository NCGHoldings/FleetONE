# 🚀 Antigravity External Development Changelog

> **Purpose:** This file documents all changes made by **Antigravity** (external AI development tool).
> Lovable should read this file before any development to avoid duplicating or conflicting with these changes.
> 
> **Last Updated:** 2026-02-12

---

## 2026-02-12

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
