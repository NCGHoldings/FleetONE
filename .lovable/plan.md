

# Fix Final Invoice Settlement Calculation: Single Source of Truth

## Root Cause

The Final Invoice (`GenerateBalanceInvoiceModal`) has **three disconnected calculation problems**:

### Problem 1: `total_paid` not passed from table to modal
`ConfirmedTripsTable.tsx` line 1588-1612 passes `quotationData` to the modal but **never includes `total_paid`**. The modal tries `(quotationData as any).total_paid` which is `undefined`, so it falls back to `advance_paid` (first payment only).

**DB reality for QUO-2025-0558-v1.4:**
- `total_paid` = 81,962.50 (two approved payments: 40,962.50 + 41,000)
- `advance_paid` = 40,962.50 (only first payment)
- Quotation total = 73,400 + 775 + 0 + 7,750 - 0 = **81,925**
- Correct balance = 81,925 - 81,962.50 = **-37.50 (overpaid)**
- But invoice shows: Total Paid = 40,962.50, Balance Due = 33,212.50

### Problem 2: `computedTotalAmount()` excludes `total_additional_charges`
The modal's `computedTotalAmount()` (line 143-148) calculates:
```
gross_revenue + fuel_cost_fuel_only + commission - discount
= 73,400 + 775 + 0 - 0 = 74,175
```
But the DB quotation has `total_additional_charges = 7,750` which is **not included**. The correct total is **81,925**.

### Problem 3: `percentage_adjustment` not applied
Both `calculateTotalAmount()` in `ConfirmedTripsTable` and `calculateFinalTotal()` in `PaymentConfirmationModal` apply `percentage_adjustment`, but the modal's `computedTotalAmount()` ignores it entirely.

## Fix: Single Settlement Formula

```
PAYABLE = gross_revenue + fuel + commission + additional_charges - discount
        + (percentage_adjustment % of base)
        + post_trip_adjustment_amount (extra KM + additional expenses)

PAID    = SUM of all approved payments (from useRealtimeSpecialHire calculated total_paid)

BALANCE = PAYABLE - PAID
        → if <= 0: show 0 with "Overpaid Credit: LKR X"
        → if > 0: show balance due
```

## Changes

### File 1: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`

**1a. Add `total_paid` and `total_additional_charges` to interface** (line 27-51)
```typescript
quotationData: {
  // ... existing fields ...
  total_additional_charges?: number;  // ADD
  percentage_adjustment?: number;     // ADD
  total_paid?: number;                // ADD (replaces unsafe cast)
}
```

**1b. Fix `computedTotalAmount()`** (line 143-148)
Include `total_additional_charges` and `percentage_adjustment`:
```typescript
const computedTotalAmount = () => {
  const base = (quotationData.gross_revenue || 0) +
    (quotationData.fuel_cost_fuel_only || 0) +
    (quotationData.commission_pass_through_amount || 0) +
    (quotationData.total_additional_charges || 0) -   // ADD THIS
    (quotationData.discount_amount_lkr || 0);
  const adjPct = quotationData.percentage_adjustment || 0;
  return Math.round(base + base * (adjPct / 100));
};
```

**1c. Fix `calculateFinalBalance()`** (line 150-157)
Use typed `total_paid` instead of unsafe cast:
```typescript
const calculateFinalBalance = () => {
  const totalAmount = computedTotalAmount();
  const adjustmentTotal = (adjustmentData.extra_km_total_charge || 0) + 
                          (adjustmentData.total_additional_expenses || 0);
  const actualTotalPaid = quotationData.total_paid ?? quotationData.advance_paid ?? 0;
  const balance = (totalAmount + adjustmentTotal) - actualTotalPaid;
  return balance <= 0 ? 0 : balance;
};
```

**1d. Add overpayment credit display** (line 608-646 in Financial Summary card)
When `calculateFinalBalance() === 0` and actual paid > payable, show:
```
Balance Due: LKR 0
Overpaid Credit: LKR 37.50
```

**1e. Fix GL posting amount** (line 396-398)
Use `computedTotalAmount()` instead of `original_quotation_amount`:
```typescript
const fullInvoiceAmount = computedTotalAmount() + 
  (adjustmentData.extra_km_total_charge || 0) + 
  (adjustmentData.total_additional_expenses || 0);
```

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`

**2a. Pass missing fields to GenerateBalanceInvoiceModal** (line 1588-1612)
Add these to the `quotationData` prop:
```typescript
total_paid: selectedTrip.total_paid || 0,
total_additional_charges: selectedTrip.total_additional_charges,
percentage_adjustment: (selectedTrip as any).percentage_adjustment,
```

### File 3: `src/lib/invoice-generator.ts`

**3a. Fix invoice HTML "Total Paid" line** (line 358-360)
Already uses `data.paidAmount` correctly. No change needed -- the fix flows from the modal passing the right value.

**3b. Add overpaid credit row** after Balance Due row (line 362-364)
When `balanceDue === 0` and `totalPaid > priceAfterDiscount`:
```html
<tr>
  <td>Overpaid Credit</td>
  <td>LKR ${(totalPaid - priceAfterDiscount).toLocaleString()}.00</td>
</tr>
```

## Correct Numbers After Fix (QUO-2025-0558-v1.4)

```
Payable:  73,400 + 775 + 0 + 7,750 - 0 = 81,925
Paid:     40,962.50 + 41,000 = 81,962.50
Balance:  81,925 - 81,962.50 = -37.50
Display:  Balance Due: LKR 0 | Overpaid Credit: LKR 37.50
```

## Summary
- Pass `total_paid`, `total_additional_charges`, `percentage_adjustment` from table to modal
- Fix `computedTotalAmount()` to include all cost components (was missing 7,750 additional charges)
- Show overpaid credit line when customer pays more than payable
- Use only approved payments for calculations (per user preference)
- No GL/AR logic changes needed

