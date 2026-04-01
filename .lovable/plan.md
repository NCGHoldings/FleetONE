

# Fix: Tax Codes Not Showing in AR Invoice Dropdown

## Root Cause

The `useTaxCodes()` hook in `useAccountingData.ts` queries `tax_codes` table correctly, and there are 7 active tax codes in the database (VAT-STD 18%, VAT-ZERO 0%, VAT-EXEMPT, WHT-5 5%, WHT-10 10%, WHT-14 14%, SSCL-2.5 2.5%). RLS policy allows authenticated users to SELECT.

The likely issue is a **silent query error** — when the query fails, `data` is `undefined` and `taxCodes?.map()` renders nothing. No error is shown to the user.

## Fix

### 1. Add error logging to `useTaxCodes` hook
In `src/hooks/useAccountingData.ts`, add error handling to the tax codes query so failures are visible.

### 2. Filter tax codes for AR invoices — show only output tax (VAT)
The `tax_codes` table has `is_output_tax` and `is_input_tax` flags. AR invoices should only show **output tax** codes (VAT-STD, VAT-ZERO, VAT-EXEMPT). WHT codes are for AP payments, not AR invoices. Filter to `is_output_tax = true` for the AR form.

### 3. Add retry and staleTime to the query
Add `retry: 2` and `staleTime: 5 * 60 * 1000` to ensure the query retries on failure and caches properly.

### 4. Show loading state in the Tax Code dropdown
When `taxCodes` is still loading, show "Loading..." instead of an empty dropdown.

## Files to modify

1. **`src/hooks/useAccountingData.ts`** — Add retry config and console.error logging to `useTaxCodes()`
2. **`src/components/accounting/ARInvoiceForm.tsx`** — Destructure `isLoading` and `error` from `useTaxCodes()`, show loading state in dropdown, filter to output taxes only

## Result
- Tax codes will appear in the dropdown (VAT-STD 18%, VAT-ZERO, VAT-EXEMPT)
- WHT codes won't clutter the AR invoice form (they belong in AP)
- Any query errors will be visible for debugging

