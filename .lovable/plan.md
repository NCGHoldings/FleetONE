

# Fix Proforma Invoice: Customer Commitment, Leasing Breakdown & Hide Payment History

## Problems from Screenshots

1. **Customer Commitment defaults to 0** — should default to the markup amount (e.g., 110% of 38.25M = 3,825,000 extra = customer commitment)
2. **Invoice page 1 totals** missing Customer Commitment and "To Be Leased" breakdown lines
3. **Invoice page 2** shows Payment History and Payment Status on proforma — should be hidden entirely for proforma invoices
4. **Bank details page** should only show bank info + signatures for proforma, no payment tracking

## Changes

### File 1: `src/components/yutong/YutongInvoiceTypeModal.tsx`

**Default customer commitment** (lines 86-89): Change from `setCustomerCommitment(0)` to calculate default as `proformaAmount - totalAmount` when percentage > 100%, i.e. the markup portion. For percentage mode, auto-calculate: `Math.max(0, proformaAmount - totalAmount)`. Customer commitment field remains editable so user can override.

**Pass customer commitment to invoice data**: Ensure `customerCommitment` and `leasingCompanyAmount` (= proformaAmount - customerCommitment) are passed in the config.

### File 2: `src/lib/yutong-order-invoice-generator.ts`

**Add to interface** (lines 30-88): Add `customer_commitment?: number` and `leasing_amount?: number` fields to `YutongOrderInvoiceData`.

**Restructure proforma totals** (lines 810-827): Change from 3-row footer (SUB TOTAL / empty / TOTAL) to 4-row footer for proforma:

```text
SUB TOTAL          | 42,075,000.00
Customer Commitment| 3,825,000.00
                   |
TO BE LEASED       | 38,250,000.00   (dark blue row, = total - commitment)
```

- Row 1: SUB TOTAL = displayAmount (declared vehicle value)
- Row 2: Customer Commitment = `data.customer_commitment` (or 0)
- Row 3: (amount in words spans these rows)
- Row 4 (dark blue total-row): "TO BE LEASED" = displayAmount - customer_commitment

**Hide Payment History for proforma** (lines 884-938): Wrap the entire payment history section and payment status section in a `!isProforma` check. Proforma page 2 shows only bank details + signatures.

### File 3: `src/hooks/useYutongOrderInvoiceManagement.ts`

Pass `customer_commitment` and `leasing_amount` from the proforma config through to the invoice data object stored in the document.

## Summary
- Customer commitment defaults to markup amount (proforma - actual bus value)
- Invoice shows: SUB TOTAL (declared value), Customer Commitment, then "TO BE LEASED" (leasing portion) in dark blue
- Page 2 hides all payment history/status for proforma invoices
- All values remain editable in the modal

