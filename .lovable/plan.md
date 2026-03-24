

# Fix Proforma Invoice: Customer Commitment = 30% of Declared Value + Editable Options

## Problem

Currently, customer commitment defaults to the **markup** (proformaAmount - totalAmount = 3,825,000). The user wants:

1. **Customer Commitment = 30% of the declared vehicle value** (e.g., 30% of 42,075,000 = 12,622,500)
2. The **30% should be adjustable** with both **percentage** and **fixed amount** options
3. **To Be Leased = Declared Value - Customer Commitment** (e.g., 42,075,000 - 12,622,500 = 29,452,500)
4. These options available at proforma creation time in the modal

## Changes

### File 1: `src/components/yutong/YutongInvoiceTypeModal.tsx`

**Add new state** for customer commitment mode:
- `commitmentMode: 'percentage' | 'fixed'` (default: `'percentage'`)
- `commitmentPercentage: number` (default: `30`)
- `commitmentFixedAmount: number`

**Fix commitment calculation** (lines 94-97):
- Replace current logic with:
  - Percentage mode: `customerCommitment = proformaAmount * commitmentPercentage / 100`
  - Fixed mode: `customerCommitment = commitmentFixedAmount`
- `leasingCompanyAmount = proformaAmount - customerCommitment`

**Replace the Amount Breakdown section** (lines 409-453) with:
- Show "Customer Commitment" with its own percentage/fixed toggle
- Quick buttons: 20%, 30%, 40%, 50%
- In fixed mode: editable input field
- Display: "To Be Leased" = proformaAmount - customerCommitment

**Update `handleConfirm`** (lines 104-117): pass new `customerCommitment` and `leasingCompanyAmount` values

### File 2: `src/lib/yutong-order-invoice-generator.ts`

No structural changes needed -- the invoice template already reads `data.customer_commitment` and calculates `displayAmount - customer_commitment` for "TO BE LEASED". The values will be correct once the modal passes the right numbers.

## Summary
- Customer Commitment defaults to 30% of declared amount (not the markup)
- User can switch between percentage and fixed amount for commitment
- Quick-select buttons for common percentages (20/30/40/50%)
- "To Be Leased" automatically = declared value minus commitment

