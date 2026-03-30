

# Fix: Final Invoice Not Including Post-Trip Adjustment Data

## Root Cause

When the user clicks "Generate Final Invoice", the code does:
```
const adj = adjustmentsData[trip.id];
setSelectedAdjustment(adj || null);
```

But `adjustmentsData` is **only populated after specific user actions** (saving a post-trip adjustment, generating an invoice). It is **never loaded on initial page load**. So when a user navigates to the page and directly clicks "Generate Final Invoice", `adjustmentsData[trip.id]` is `undefined`, `selectedAdjustment` becomes `null`, and the invoice renders with zero adjustments -- making the 6,900 payment appear as "Overpaid Credit" instead of a legitimate post-trip charge.

## Fix

### 1. Fetch adjustment data fresh inside the modal (not rely on parent props)

**File: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`**

Add a `useEffect` that runs when `open` becomes true:
- Query `special_hire_trip_adjustments` WHERE `quotation_id = quotationData.id` ORDER BY `created_at` DESC LIMIT 1
- Store result in local `freshAdjustmentData` state
- Use `freshAdjustmentData` merged with `adjustmentData` props (fresh data takes priority) for all calculations

This mirrors the same pattern already used for `freshTotalPaid` via `PaymentTimelineFresh`.

### 2. Also load adjustments on initial table render

**File: `src/components/special-hire/ConfirmedTripsTable.tsx`**

Add a `useEffect` that calls `loadAdjustmentData()` for each confirmed trip when quotations load. This ensures `adjustmentsData` is populated even before the user interacts with any modal.

### 3. Fix Financial Summary display

**File: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`**

Line 656 shows "Total Payable" as `computedTotalAmount()` without adjustments. Change to include adjustments:
```
LKR {(computedTotalAmount() + adjustmentTotal).toLocaleString()}
```

## Expected Result

For the trip with 148,571 quote + 6,900 post-trip adjustment:
- Original Quote Amount: 148,571
- Extra KM Charge: +6,900
- Adjusted Sub-Total: 155,471
- Total Paid: 155,471
- Balance Due: 0
- No "Overpaid Credit" line

