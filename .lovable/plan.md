
# Fix Unit Price Typing Space Across Finance Forms

## What I found
- In `ARInvoiceForm.tsx`, the **Unit Price** column is still only `120px`.
- The shared `CurrencyInput` uses an inside prefix plus large left padding (`pl-10`), so the **actual typing area becomes too small**.
- Because the line table is not using a strict fixed column layout, long fields like **Revenue Account** can steal space from the price field.
- Your current **Description textarea should stay as it is**; the issue is the money-field space, not the description behavior.

## Plan

### 1. Improve the shared money input for table rows
Update `src/components/ui/currency-input.tsx` so it supports a **compact/table variant**:
- smaller prefix spacing
- better visible typing area
- `font-mono tabular-nums` for clearer numbers
- keep existing default style for normal full-width forms

This avoids breaking other screens while fixing cramped price fields.

### 2. Fix AR Invoice row sizing properly
Update `src/components/accounting/ARInvoiceForm.tsx` to:
- keep the current auto-expanding **Description** textarea unchanged
- switch the line table to a more reliable column layout (`table-fixed` / `colgroup`)
- increase **Qty** to about `90px`
- increase **Unit Price** to about `150–160px`
- slightly rebalance nearby columns so the price box has real breathing room
- if needed, give the dialog a bit more horizontal space

### 3. Apply the same standard to similar finance forms
Use the same table-input sizing pattern in editable accounting line-item forms:
- `src/components/accounting/APInvoiceForm.tsx`
- `src/components/accounting/SalesOrderForm.tsx`
- `src/components/accounting/PurchaseOrderForm.tsx`
- `src/components/accounting/SupplierQuotationForm.tsx`
- `src/components/accounting/APPaymentForm.tsx` (direct payment lines)

For money entry fields, standardize on `CurrencyInput` so typing space and formatting stay consistent everywhere.

### 4. QA checks
Verify in preview that:
- values like `19,999`, `250,000`, `1,250,000` stay visible while typing
- Qty and Unit Price fields are easy to edit on the current desktop width
- Description auto-expand still works
- totals/calculations remain unchanged

## Technical details
```text
Root cause:
120px column
+ CurrencyInput prefix/padding
+ unstable table column sizing
= visible typing area is too small

Safe fix:
improve CurrencyInput for dense rows
+ lock table column widths
+ widen qty/unit price fields
+ keep description behavior unchanged
```
