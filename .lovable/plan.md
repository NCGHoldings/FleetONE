

# Fix Special Hire: Payment Tracking, Final Invoice Errors & Business Flow Alignment

## Problems Identified

### 1. Balance Due shows wrong after post-trip adjustment is added to an already-settled trip
**Root cause**: In `useRealtimeSpecialHire.ts` (line 226), `calculatedBalance` uses `Math.max(finalTotal - calculatedTotalPaid, 0)`, which correctly computes the balance. However, the `getPaymentStatusBadge` in `ConfirmedTripsTable.tsx` (line 318) uses `calculateTotalAmount()` which DOES include post-trip adjustments — so it correctly shows "Partially Paid" when adjustment is added. But the **Financial column** (lines 1296-1307) shows `trip.total_paid` and `trip.balance_due` which come from the hook and are correctly calculated. The **Payment History modal** (line 2081) passes `calculateTotalAmount(selectedTrip)` as `totalPayable` and `PaymentTimelineFresh` fetches fresh data — so it's always correct.

**The real mismatch**: The `advance_paid` field (line 238) falls back to summing only `payment_type === 'advance'` payments, while `total_paid` sums ALL approved payments. When the Final Invoice modal opens, it uses `quotationData.advance_paid` as "Advance Paid" but `freshTotalPaid` for balance calculation. If a balance payment was recorded before the trip (as sales receipt), it might be typed as "balance" but treated separately from advance — causing the balance display to be wrong.

### 2. Final Invoice generation sometimes crashes ("System Interruption")
**Root cause**: The `getStatusBadge()` function in `GenerateBalanceInvoiceModal.tsx` (line 629) does `const config = statusConfig[invoiceStatus]` — if `invoiceStatus` has an unexpected value (e.g., from DB returning something other than 'draft'|'sent_to_customer'|'payment_pending'|'paid'), `config` is `undefined` and `config.icon` crashes.

### 3. "Generate Final Invoice" button hidden when there are no payments
**Root cause**: Line 1435 requires `approvedPayments.length > 0`. But the user describes scenarios where no payment is made before the trip, and the invoice should still be generated after the trip.

### 4. Sales Receipt generation for balance/pre-trip payments
Currently the system only shows "Email Sales Receipt" for advance payments (line 1533). Pre-trip balance payments should also generate sales receipts since the trip hasn't happened yet (can't give a final invoice before the trip).

## Solution

### Fix 1: Crash-proof the Final Invoice modal status badge
**File**: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
- Add fallback: `const config = statusConfig[invoiceStatus] || statusConfig.draft;`

### Fix 2: Allow "Generate Final Invoice" without any payments
**File**: `src/components/special-hire/ConfirmedTripsTable.tsx`
- Change condition from `approvedPayments.length > 0` to `trip.trip_status === 'completed' || trip.trip_status === 'confirmed'` — Final Invoice should be available after the trip regardless of payment status (covers: no payment, partial payment, full payment scenarios)

### Fix 3: Fix balance calculation consistency
**File**: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
- In `getActualTotalPaid()` (line 188), ensure it always uses fresh DB data over stale props
- In `generateInvoiceData()` (line 228), use `getActualTotalPaid()` for `advanceAmount` instead of `quotationData.advance_paid` — since "advance" is misleading; what matters is total already paid

**File**: `src/hooks/useRealtimeSpecialHire.ts`
- Fix `advance_paid` calculation (line 238): Use the DB's `advance_paid` field first, and only fall back to summing advance-type payments. Don't let it override with a smaller number when the DB already has a correct value.

### Fix 4: Make Payment History the source of truth for Financial column
**File**: `src/components/special-hire/ConfirmedTripsTable.tsx`
- The Payment History modal already works perfectly (user confirmed). The Financial column should use the same `calculateTotalAmount()` for total and the hook's calculated values for paid/due — which it already does. The issue is in the Final Invoice modal using stale/mixed data.

## Files to Modify
- `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` — crash fix + balance calculation fix
- `src/components/special-hire/ConfirmedTripsTable.tsx` — remove payment requirement for Final Invoice, fix sales receipt visibility for pre-trip balance payments
- `src/hooks/useRealtimeSpecialHire.ts` — minor: ensure advance_paid doesn't override DB value incorrectly

## Result
- Final Invoice modal never crashes (safe fallback for status badge)
- "Generate Final Invoice" available for all confirmed/completed trips regardless of payment status
- Balance calculations consistent between Payment History and Financial column
- All business scenarios supported: no payment → invoice, advance only → invoice, full payment → invoice, adjustment → payment reminder → payment → invoice

