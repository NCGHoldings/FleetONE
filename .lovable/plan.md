

# Fix: Engine Capacity Save + Vehicle Details Refresh After Save

## Two Issues Found

### Issue 1: Engine capacity `parseInt` can produce `NaN`
In `YutongInvoiceDataModal.tsx` line 182, `parseInt(e.target.value)` returns `NaN` when the field is cleared mid-edit. `NaN` sent to Supabase causes the update to fail silently or save null.

**Fix**: Use `parseInt(e.target.value) || 0` to default to 0 when parsing fails.

### Issue 2: "Vehicle details incomplete" persists after saving
The `EnhancedYutongOrderDetailsModal` receives `order` as a static prop. When `YutongInvoiceDataModal` saves and invalidates React Query, the parent list re-fetches, but the modal still holds the stale `order` object. So `vehicleDetailsComplete` stays false.

**Fix**: In `YutongOrderInvoiceGenerator`, after vehicle data modal `onSuccess`:
- Re-fetch the order directly from Supabase and update a local state copy
- Use local order state (falling back to prop) for `vehicleDetailsComplete` check
- This way saving vehicle details immediately reflects in the UI without closing and reopening the modal

## Files to modify

### 1. `src/components/yutong/YutongInvoiceDataModal.tsx`
- Line 182: `parseInt(e.target.value)` → `parseInt(e.target.value) || 0`

### 2. `src/components/yutong/YutongOrderInvoiceGenerator.tsx`
- Add local `orderData` state initialized from `order` prop
- In `handleVehicleDataSuccess`, re-fetch order from `yutong_orders` by ID and update `orderData`
- Use `orderData` instead of `order` for `vehicleDetailsComplete` and everywhere else
- Also pass updated data to `YutongInvoiceDataModal` existingData

### 3. Same pattern for Sinotruck/LightVehicle if they have the same issue
- `SinotrukOrderInvoiceGenerator.tsx` — same local state refresh pattern
- `SinotruckOrderInvoiceGenerator.tsx` — same

