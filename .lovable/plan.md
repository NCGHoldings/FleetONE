

# Fix: Sales Receipt Cumulative Balance & Payment History

## Problem

Each Sales Receipt shows `Balance Due = Total - THIS payment only`, ignoring all prior payments. Screenshot shows:
- Receipt 1: Paid 131,000 → Balance Due: 130,000 (correct, only 1 payment)
- Receipt 2: Paid 132,974 → Balance Due: 131,974 (WRONG — should be 5,750 because 131,000 was already paid)

The root cause: `paidAmount` in `InvoiceData` is set to `paymentData.amount` (current payment only), and the HTML template computes `Balance Due = totalAmount - paidAmount`.

## Plan

### 1. Add `totalPaidToDate` field to InvoiceData (`src/lib/invoice-generator.ts`)

Add a new optional field `totalPaidToDate?: number` to the `InvoiceData` interface. This represents the cumulative sum of all approved payments up to and including the current one.

Update the sales receipt HTML template (lines 146-156) to:
- Show "This Payment" amount (current `paidAmount`)
- Show "Total Paid to Date" (cumulative `totalPaidToDate`)
- Calculate `Balance Due = totalAmount - totalPaidToDate` instead of `totalAmount - paidAmount`
- Label the payment row correctly (ADVANCE PAYMENT vs BALANCE PAYMENT based on `invoiceType`)

### 2. Pass cumulative total in ConfirmedTripsTable.tsx (draft generation)

At line 427, after confirming a payment, query `special_hire_payments` for all approved + the new payment for this quotation to compute `totalPaidToDate`. Pass it alongside `paidAmount`.

### 3. Pass cumulative total in useFinanceApproval.ts (approval regeneration)

Line 448 already computes `totalApprovedPaid` — use it as `totalPaidToDate` for sales receipts too (currently only used for invoices). Change the line to always pass `totalPaidToDate: totalApprovedPaid`.

Also fix the other generation points (lines 374 and 596) to fetch and pass cumulative totals.

### 4. Fix the "Regenerate Sales Receipt" path (useFinanceApproval.ts line ~590)

The `generateApprovedInvoice` function also builds `InvoiceData` with just `paymentData.amount`. Add a query for all approved payments to compute `totalPaidToDate`.

## Files
- **Modify**: `src/lib/invoice-generator.ts` — add `totalPaidToDate` to interface; update sales receipt HTML to show cumulative balance
- **Modify**: `src/components/special-hire/ConfirmedTripsTable.tsx` — compute and pass `totalPaidToDate` when generating draft receipts
- **Modify**: `src/hooks/useFinanceApproval.ts` — pass `totalPaidToDate` in all 3 generation paths (approval, fallback, regeneration)

## Result
- Receipt 1 (131,000): Balance Due = 269,724 - 131,000 = 138,724
- Receipt 2 (132,974): Balance Due = 269,724 - 263,974 = 5,750
- Each receipt shows the individual payment amount AND cumulative total paid to date

