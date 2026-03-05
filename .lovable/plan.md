

# Fix AP Invoice Edit Pre-fill + Reorder Line Columns

## Problems

1. **Edit doesn't pre-fill data**: `AccountsPayableView` sets `editingInvoice` state when Edit is clicked, but `APInvoiceForm` has no prop to receive it. The form always opens with blank defaults — no previous data loaded.

2. **Line column order wrong**: Currently the table columns are: Description → GL Account → Qty → Price → Tax → Total. User wants: GL Account → Description → Qty → Price → Tax → Total (GL Account first).

3. **Same issue exists on AR side**: `AccountsReceivableView` sets `editingInvoice` but `ARInvoiceForm` doesn't accept it either.

## Plan

### File 1: `src/components/accounting/APInvoiceForm.tsx`

- Add `editingInvoice?: any` prop to `APInvoiceFormProps`
- Add `useEffect` that runs when `editingInvoice` changes: pre-fills `form.reset()` with invoice header data (vendor_id, invoice_number, invoice_date, due_date, notes, apply_wht, wht_rate)
- Fetch existing invoice lines from `ap_invoice_lines` table when editing, populate `setLines()` with description, quantity, unit_price, tax_code, tax_rate, account_id, line_total
- Change dialog title to "Edit AP Invoice" when editing
- Change submit button to "Update Invoice" when editing
- Add an `useUpdateAPInvoice` mutation call path for updates (update header + delete old lines + insert new lines)
- **Reorder table columns**: Move GL Account column before Description

### File 2: `src/components/accounting/AccountsPayableView.tsx`

- Pass `editingInvoice={editingInvoice}` prop to `<APInvoiceForm>`

### File 3: `src/components/accounting/ARInvoiceForm.tsx`

- Same pattern: add `editingInvoice` prop, pre-fill form + lines on edit, fetch `ar_invoice_lines`, update path
- Reorder columns: GL Account before Description

### File 4: `src/components/accounting/AccountsReceivableView.tsx`

- Pass `editingInvoice={editingInvoice}` prop to `<ARInvoiceForm>`

### File 5: `src/hooks/useAccountingMutations.ts`

- Add `useUpdateAPInvoice` mutation: updates `ap_invoices` header, deletes old `ap_invoice_lines`, inserts new lines
- Add `useUpdateARInvoice` mutation: same pattern for AR

## Summary

| File | Change |
|---|---|
| `APInvoiceForm.tsx` | Accept `editingInvoice` prop, pre-fill form+lines, reorder GL Account before Description |
| `AccountsPayableView.tsx` | Pass `editingInvoice` to form |
| `ARInvoiceForm.tsx` | Same edit pre-fill + column reorder |
| `AccountsReceivableView.tsx` | Pass `editingInvoice` to form |
| `useAccountingMutations.ts` | Add `useUpdateAPInvoice` and `useUpdateARInvoice` mutations |

