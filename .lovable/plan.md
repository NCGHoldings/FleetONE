

# Fix: Inconsistent Document Labels, Wrong Balance in Payment Modal, and Stale Data in Trip Details

## Problems Identified

### 1. Workflow column shows "Sales Receipt" and "Invoice" but Documents modal shows both as "Sales Receipt"
- In `SignatureWorkflowIndicator.tsx` (line 43-45), `getDocumentTypeLabel()` maps `payment_type === 'balance'` to "Invoice", but advance to "Sales Receipt"
- In the Documents modal (ConfirmedTripsTable line 1926), labels are based on `document_type` field
- The mismatch happens because both advance and balance documents are stored with `document_type: 'sales_receipt'` in `document_storage`, but the workflow indicator uses `payment_type` to decide the label
- **Fix**: Unify labeling logic — use a single shared helper function that both the workflow indicator and documents modal use. The label should be determined consistently: advance = "Sales Receipt", balance/full = "Invoice"

### 2. PaymentConfirmationModal shows wrong balance after 2nd payment
- In `PaymentConfirmationModal.tsx` (line 102-103):
  ```
  const advancePaid = quotationData.advance_paid || 0;
  const balanceDue = finalTotal - advancePaid;
  ```
- It only subtracts `advance_paid` (first advance payment) from the total, not `total_paid` (all approved payments)
- When the user already made 2 payments (advance + balance), the modal still calculates balance as `total - advancePaid` instead of `total - totalPaid`
- **Fix**: Pass `total_paid` to the modal and use it for balance calculation instead of just `advance_paid`

### 3. Trip Details modal (eye icon) shows "Paid: LKR 0" despite payments existing
- In `ConfirmedTripsTable.tsx` (line 1829-1850), the TripDetailsModal receives:
  - `total_amount: calculateTotalAmount(selectedTrip)` — correct
  - But `advance_paid` and `balance_due` come from `selectedTrip.advance_paid` and `selectedTrip.balance_due`
  - The `PaymentTimeline` component (line 277-287) receives these static values and also receives `payments` array
  - Looking at the PaymentTimeline component, it correctly calculates `totalPaidAmount` from the payments array (line 65-67), showing correct payment history
  - BUT it shows `safeBalance` (line 129) from the prop `balanceDue` which is the raw value, not recalculated
  - The payments passed to TripDetailsModal use the wrong field mapping — `trip.payments` maps `status` but PaymentTimeline expects `payment_status`
- **Fix**: PaymentTimeline should calculate balance from `totalAmount - totalPaidAmount` instead of using the `balanceDue` prop directly. Also fix the payment field mapping.

## Implementation Plan

### File 1: Create shared document label helper
**New file**: `src/lib/special-hire-document-helpers.ts`
- Export `getDocumentLabel(doc: { document_type: string; payment_type: string }): string`
- advance → "Sales Receipt", balance/full → "Invoice", else use document_type

### File 2: `src/components/special-hire/SignatureWorkflowIndicator.tsx`
- Import and use the shared helper in `getDocumentTypeLabel()`

### File 3: `src/components/special-hire/ConfirmedTripsTable.tsx`
- Documents modal (line ~1926): Use the shared helper for label
- PaymentConfirmationModal props (line 1678): Add `total_paid: selectedTrip.total_paid`
- TripDetailsModal payments mapping: Ensure `payment_status` field is mapped correctly from `status`

### File 4: `src/components/special-hire/PaymentConfirmationModal.tsx`
- Add `total_paid` to the `quotationData` interface
- Line 102-103: Change balance calculation to use `total_paid` instead of just `advance_paid`:
  ```
  const totalPaidSoFar = quotationData.total_paid || quotationData.advance_paid || 0;
  const balanceDue = Math.max(finalTotal - totalPaidSoFar, 0);
  ```

### File 5: `src/components/special-hire/PaymentTimeline.tsx`
- Calculate displayed balance from actual payments instead of raw prop:
  ```
  const actualBalance = Math.max(safeTotal - totalPaidAmount, 0);
  ```
- Use `actualBalance` in the UI instead of `safeBalance`

## Result
- All views (workflow column, documents modal, trip details, payment modal) show consistent document labels
- Balance due is always calculated from actual approved payments, not stale DB fields
- Single source of truth for payment calculations across all modals

