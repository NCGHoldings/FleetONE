

# Cash Flow Statement — Audit Results & Improvement Plan

## Current Assessment

The Cash Flow Statement has a solid IAS 7 foundation with both Direct and Indirect methods, reconciliation checks, working capital analysis, and CSV export. However, there are **8 critical gaps** that prevent it from being "fully automated, any-company-ready, zero manual intervention":

## Issues Found

### 1. No Interest/Dividend/Tax Separation (IAS 7.31-35 Violation)
IAS 7 **requires** separate disclosure of: Interest Paid, Interest Received, Dividends Paid, Dividends Received, and Income Taxes Paid. Currently these are lumped into "Other operating cash flows". Your COA already has dedicated accounts (e.g., 41104001 INTEREST ON SAVINGS, 22501001 INCOME TAX PAYABLE) but the classifier doesn't extract them.

### 2. Direct Method Classification Too Simplistic
The direct method only looks at `nonCashLines[0]` (the first non-cash line) to classify each journal entry. Multi-line entries (e.g., a payment covering supplier + tax + bank fee) get classified based on just one line, misclassifying the rest.

### 3. Employee Cost Detection by Keyword Only
Employee payments are identified by searching for "salary/wage/payroll" in the JE description or account name. This misses accounts like "CASUAL WAGES PAYABLE" (code 22201004) and "SALARY ADVANCE" accounts. Should classify by account code prefix instead (222xx = salary-related).

### 4. No Scalability Guard — Fetches ALL Journal Entries
The hook fetches every posted JE (`journal_entries.select('*, lines:...')`) without any date filtering at the query level. With 465 JEs now, it works. At 10,000+ JEs (any medium company after 2 years), this will timeout. The date filter happens in-memory after fetching everything.

### 5. No Business Unit Filtering
Only filters by `company_id`. The NCG sub-company architecture requires `business_unit_code` filtering for isolated cash flow reports per sub-company (SBO, YUT, etc.).

### 6. Opening Balance Logic Flaw
Uses `acc.opening_balance || acc.current_balance || 0` as the static opening balance, then adds pre-period movements. If `current_balance` is used as fallback, it includes ALL movements (including the current period), double-counting.

### 7. No Non-Cash Transaction Disclosures
IAS 7.43 requires disclosure of significant non-cash investing/financing activities (e.g., asset acquisitions via lease, debt-to-equity conversions). These should be listed as a supplementary note.

### 8. No Comparative Period
Professional cash flow statements show current period vs prior period side by side. Currently shows only one period.

## Fix Plan

### File 1: `src/hooks/useCashFlowData.ts` — Core Data Engine Fixes

- **Add IAS 7 required line items**: Extract interest paid/received, dividends, taxes paid from JE lines using account code classification (41104xxx = interest income, 22501xxx = income tax, 222xx = salary/wages)
- **Fix direct method**: Analyze ALL non-cash lines proportionally, not just the first one
- **Server-side date filtering**: Add `.gte('entry_date', preStartDate)` to the JE query to avoid fetching ancient data. Use a reasonable lookback (e.g., 2 years before period start for opening balances)
- **Add business_unit_code filter**: Accept optional `businessUnitCode` param and apply to JE query
- **Fix opening balance**: Use only `opening_balance` (never `current_balance`) as the static base; compute everything else from JE movements
- **Add comparative period support**: Accept optional `comparativeStart/End` dates and return a second `CashFlowData` object

### File 2: `src/components/accounting/CashFlowView.tsx` — UI Enhancements

- **Add IAS 7 required disclosures**: Show Interest Paid, Interest Received, Dividends, Income Tax Paid as separate lines in both Direct and Indirect operating sections
- **Add "Non-Cash Activities" supplementary section**: List entries that don't touch cash accounts but are investing/financing (e.g., depreciation is already handled; add lease acquisitions, asset swaps)
- **Add comparative column**: Show prior period amounts side-by-side
- **Add business unit selector**: Dropdown for sub-company filtering when under NCG Holding

## Files to Change

- `src/hooks/useCashFlowData.ts` — fix classification engine, add date-filtered queries, IAS 7 required items, business unit filter, comparative period support
- `src/components/accounting/CashFlowView.tsx` — add IAS 7 disclosure lines, comparative columns, business unit selector, non-cash activities section

## Result

- IAS 7 fully compliant with all required disclosures (interest, tax, dividends)
- Direct method correctly classifies multi-line journal entries
- Scales to 100,000+ journal entries via server-side date filtering
- Works per sub-company (business unit) or consolidated
- Comparative period for professional reporting
- Zero manual intervention — all data derived from posted GL entries automatically

