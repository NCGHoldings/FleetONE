

# Fix Proforma Invoice Display and Logic

## Problems Found

From the screenshots and code review:

1. **Invoice shows "110% OF TOTAL"** in the amount-in-words section (line 813) — this percentage should NEVER appear on the document shown to leasing companies
2. **PAYMENT row appears on proforma** (line 820-821) — proforma invoices should not show payment history in the totals
3. **TOTAL row shows 38,250,000** (actual bus value via `data.total`) instead of the declared amount (42,075,000) — inconsistent with the unit price/total column above
4. **SUB TOTAL also shows 38,250,000** — should match the proforma/declared amount
5. **Customer Commitment shows -3,825,000** (negative) in the modal — broken formula when proforma exceeds bus value

## Fixes

### File 1: `src/lib/yutong-order-invoice-generator.ts`

**Line 813** — Remove percentage from amount-in-words label for proforma:
- Change from: `AMOUNT IN WORD (${percentage}% OF TOTAL)`
- Change to: `AMOUNT IN WORDS` (no percentage shown)

**Lines 816-825** — Fix proforma totals section to use `displayAmount` consistently:
- For proforma invoices:
  - SUB TOTAL = `displayAmount` (the proforma/declared amount, e.g. 42,075,000)
  - Hide PAYMENT row entirely (replace with empty or skip)
  - TOTAL = `displayAmount`
- For non-proforma, non-tax invoices: keep current behavior (subtotal, payment, balance)

**Line 847** — Remove percentage mention from proforma notice text:
- Change from: "The amount shown represents X% of the total vehicle price."
- Change to: "The amount shown is the declared vehicle value for financing purposes."

### File 2: `src/components/yutong/YutongInvoiceTypeModal.tsx`

**Lines 96-98** — Fix customer commitment calculation:
- When proforma exceeds total (percentage > 100% or fixed > total), customer commitment should default to 0 (not negative)
- Formula: `Math.max(0, totalAmount - proformaAmount)` for auto-calc mode
- In fixed mode, customer commitment remains independently editable

## Technical Details

The key variable `displayAmount` (line 95) already correctly resolves to `proforma_amount` for proforma invoices. The bug is that the totals footer rows at lines 816-825 bypass `displayAmount` and use `data.subtotal` and `data.total` directly.

The proforma invoice format should be clean:
- One price shown throughout = declared vehicle value
- Amount in words = declared vehicle value in words
- SUB TOTAL = declared vehicle value
- No PAYMENT row
- TOTAL = declared vehicle value
- Proforma notice = generic text without revealing percentage

