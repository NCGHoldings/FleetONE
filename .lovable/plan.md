

# Fix Trial Balance — Two Critical Issues

## Problem 1: No Financial Periods Exist
The `financial_periods` table is **empty**. The Trial Balance requires selecting a period, so nothing can be generated. The system already has a "Financial Periods" management page (under Settings) that can auto-generate monthly or quarterly periods — but none have been created yet.

**Fix**: Create a migration to auto-seed financial periods covering the existing journal entry date range (Oct 2025 → Mar 2026, plus Apr 2026). This gives 7 monthly periods immediately. Users can still manage periods manually going forward.

## Problem 2: Journal Entry Lines Never Fetched
The `useJournalEntries` hook selects `"*, business_unit_code"` from `journal_entries` but does **not** join `journal_entry_lines`. The Trial Balance code on line 102 checks `entry.lines` — which is always `undefined`. So period movements (Debit/Credit) are always zero.

**Fix**: Create a dedicated query for the Trial Balance that fetches journal entry lines with their account IDs, filtered by period date range. Instead of loading all entries + lines into memory, aggregate directly in SQL for performance (370+ posted entries).

## Problem 3: Opening Balance Logic Is Wrong
Currently opening balances come from `account.opening_balance` (a static field on COA). For a proper Trial Balance, opening balance should be the **cumulative sum of all posted JE lines before the period start date**. The static `opening_balance` field is only valid for the very first period.

**Fix**: Calculate opening balances from journal entries dated before the period start.

---

## Implementation

### 1. Migration: Seed Financial Periods (Oct 2025 – Apr 2026)
Create 7 monthly periods for the NCG Holding company, covering all existing posted journal entries.

### 2. New hook: `useTrialBalanceData` in `src/hooks/useAccountingData.ts`
A dedicated query that:
- Accepts `periodStartDate`, `periodEndDate`, `companyId`, optional `costCenterId`
- Fetches **opening movements** (all posted JE lines before period start) grouped by `account_id`
- Fetches **period movements** (posted JE lines within period) grouped by `account_id`
- Returns pre-aggregated data — no client-side looping through thousands of lines

### 3. Rewrite `TrialBalanceView.tsx` calculation logic
- Replace `useJournalEntries("posted")` with the new `useTrialBalanceData` hook
- Opening balance = `account.opening_balance` + sum of all JE lines before period start (handles the "COA opening balance is initial only" correctly)
- Period movements = sum of JE lines within the period
- Closing = Opening + Period movements
- Proper debit-normal vs credit-normal placement based on account type

### Files
- **Create**: Migration to seed 7 monthly financial periods
- **Modify**: `src/hooks/useAccountingData.ts` — add `useTrialBalanceData` hook
- **Modify**: `src/components/accounting/TrialBalanceView.tsx` — use new hook, fix calculation logic

### Accounting Principles Enforced
- DR = CR validation on all three columns (Opening, Period, Closing)
- Debit-normal accounts (Asset, Expense, Cost of Sales) show positive balance in Debit column
- Credit-normal accounts (Liability, Equity, Revenue) show positive balance in Credit column
- Only `posted` status journal entries included (excludes draft, void, reversed)
- Company isolation via `company_id` filter
- Business unit filtering preserved

