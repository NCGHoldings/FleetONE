

# Fix "Finance Settings Not Configured" + Verify Bulk AR Per-Student Flow

## Problem 1: Settings Show "Not Configured" Despite Being Saved

The database has **4 settings rows** across 2 companies:
- **NCG Holding** (`f40b0a9d`): 2 rows with `trade_receivable_account_id = NULL`, `sbs_collection_account_id = NULL`
- **School Bus Operations** (`0fba4a2f`): 2 rows with accounts **properly configured**

`useBranchFinanceSettings()` queries using `selectedCompanyId`. When the user navigates school bus pages while the company selector shows "NCG Holding" (the parent), it finds the holding company's settings which have NULL accounts — triggering the "Not Configured" warning.

**Fix**: Update `useBranchFinanceSettings` to also search across related sub-company settings when the current company's settings have null accounts. Specifically, add a fallback: if the found settings have null `trade_receivable_account_id`, try querying with the SBO sub-company ID.

### Files to Edit
**`src/hooks/useSchoolBusFinance.ts`** — `useBranchFinanceSettings` function (lines 130-163):
- After finding settings for `selectedCompanyId`, check if `trade_receivable_account_id` is null
- If null, try the other company ID — fetch all `school_bus_finance_settings` matching this `branch_id` regardless of company, and pick the one with configured accounts
- This ensures settings are always found regardless of which company context the user is viewing from

Also update the `BulkARInvoiceDialog.tsx` default settings fallback query (lines 34-45) to search across all companies when the primary query returns null accounts.

## Problem 2: Confirm Bulk AR Creates Individual Invoices (Already Working)

The code already creates **individual** `ar_invoices` and `school_ar_invoices` per student (confirmed in lines 460-625 of `useSchoolBusFinance.ts`). Each student gets:
- Their own Journal Entry with unique `entry_number`
- Their own `ar_invoices` record with unique `invoice_number`
- Their own `school_ar_invoices` record linked to the AR invoice

This is correct — no changes needed for this part.

## Summary of Changes

| File | Change |
|---|---|
| `src/hooks/useSchoolBusFinance.ts` | Update `useBranchFinanceSettings` to fallback across companies when settings have null accounts |
| `src/components/school/BulkARInvoiceDialog.tsx` | Remove redundant default settings query (already handled by the hook fallback) |

