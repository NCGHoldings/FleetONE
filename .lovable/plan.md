

# Add GL Account Selector to AP Invoice Lines

## Problem
AP Invoice lines have no way to specify which GL expense account each line should hit. For miscellaneous expenses (water bills, utilities, etc.), users need to manually link a COA account per line. Currently the `account_id` column exists in `ap_invoice_lines` but is never populated from the form.

## Changes

### 1. `src/components/accounting/APInvoiceForm.tsx`
- Add `account_id` field to the `InvoiceLine` interface
- Add a new **"GL Account"** column in the invoice lines table with a searchable COA account selector (using the existing `SearchableAccountSelector` component)
- If the user does not select an account, it defaults to the `default_expense_account_id` from `gl_settings` (fetched once when the form opens)
- Import `useChartOfAccounts` or fetch COA for the selector
- Pass `account_id` through to the `onSubmit` lines data

### 2. `src/hooks/useAccountingMutations.ts` (`useCreateAPInvoice`)
- Add `account_id?: string` to the line type in the mutation input
- Include `account_id` in the `lineData` insert map so it persists to `ap_invoice_lines.account_id`

### Result
- Each AP invoice line gets an optional searchable GL account selector
- Users can manually assign expense accounts (e.g., Water & Electricity, Repairs, etc.)
- If left blank, the system can fall back to the default expense account from GL settings
- The `account_id` is saved to the database for accurate GL posting

