
# Special Hire Quotation Edit Fix Plan

## Problem Summary

When editing a Special Hire quotation, the **"Update" button is permanently disabled** because the form's `costData` state is never initialized from the existing quotation data.

### Root Cause
The form initialization in `SpecialHireForm.tsx` loads many values from `initialData` (customer info, stops, charges) but **does NOT populate `costData`** on mount when editing. Since the submit button has `disabled={loading || !costData}`, users cannot submit edits.

### User Experience Issue
Users must manually click "Calculate Costs" before they can update a quotation, which:
1. Is confusing (button appears disabled with no explanation)
2. May trigger unnecessary Google Maps API calls
3. Could accidentally change preserved cost calculations

---

## Technical Details

### Current Flow (Broken)
1. User clicks "Edit" on a quotation
2. Edit Type Selection Modal appears (Staff Edit / Customer Request)
3. User selects type and continues
4. SpecialHireForm opens with form fields populated from `initialData`
5. **`costData` remains `null`** because no initialization logic exists
6. Submit button is disabled (`!costData` evaluates to `true`)
7. User stuck - cannot submit without clicking "Calculate Costs"

### Expected Flow (Fixed)
1. User clicks "Edit" on a quotation
2. Edit Type Selection Modal appears
3. User selects type and continues
4. SpecialHireForm opens with form fields AND `costData` populated from `initialData`
5. Submit button is enabled immediately
6. User can make changes and submit
7. If route-critical fields changed, system recalculates automatically on submit
8. If no route changes, preserved calculations are used

---

## Implementation Plan

### Step 1: Add `costData` Initialization for Edit Mode

Add a new `useEffect` in `SpecialHireForm.tsx` that populates `costData` from `initialData` when editing:

**Location**: After the existing `useEffect` for loading intermediate stops (around line 317)

**Logic**: Map the stored quotation fields to the `costData` structure that the form expects.

The initialization will include:
- Distance values (`km_parking_to_pickup`, `km_trip`, `km_drop_to_parking`)
- Financial calculations (`hire_charge`, `fuel_cost_fuel_only`, `gross_revenue`)
- Time charges (`overtime_charge`, `overnight_charge`, `fixed_rate`)
- Commission and discount details
- Other expenses and additional charges

### Step 2: Structure the `costData` Object

The `costData` object needs to match the structure set by `calculateCosts()`:

| Field | Source from `initialData` |
|-------|---------------------------|
| `kmParkingToPickup` | `km_parking_to_pickup` |
| `kmTrip` | `km_trip` |
| `kmDropToParking` | `km_drop_to_parking` |
| `fuelCostFuelOnly` | `fuel_cost_fuel_only` |
| `hireCharge` | `hire_charge` |
| `grossRevenue` | `gross_revenue` |
| `customerTotalWithFuel` | `customer_total_with_fuel` |
| `overtimeCharge` | `overtime_charge` |
| `overnightCharge` | `overnight_charge` |
| `fixedRate` | `fixed_rate` |
| `commissionPct` | `commission_pct` |
| `commissionAmount` | `commission_amount` |
| `discountPct` | `discount_percentage` |
| `discountAmount` | `discount_amount_lkr` |
| `netProfit` | `net_profit` |
| `additionalCharges` | `JSON.parse(additional_charges)` |
| `otherExpenses` | `JSON.parse(other_expenses)` |

### Step 3: Handle Rate Card Details for Display

For the CostBreakdown component to display correctly, also initialize:
- `rateCardDetails` with overtime hours, standard hours, etc.
- `pickupDateTime` and `dropDateTime` for time analysis display

---

## Code Changes

### File: `src/components/special-hire/SpecialHireForm.tsx`

Add new `useEffect` after existing initialization:

```typescript
// Initialize costData from initialData when editing
useEffect(() => {
  if (isEditing && initialData) {
    // Parse stored JSON fields
    const additionalCharges = initialData.additional_charges 
      ? (Array.isArray(initialData.additional_charges) 
          ? initialData.additional_charges 
          : JSON.parse(initialData.additional_charges || '[]'))
      : [];
    
    const otherExpenses = initialData.other_expenses
      ? (Array.isArray(initialData.other_expenses)
          ? initialData.other_expenses
          : JSON.parse(initialData.other_expenses || '[]'))
      : [];

    // Initialize costData to enable submit button
    setCostData({
      kmParkingToPickup: initialData.km_parking_to_pickup || 0,
      kmTrip: initialData.km_trip || 0,
      kmDropToParking: initialData.km_drop_to_parking || 0,
      fuelCostFuelOnly: initialData.fuel_cost_fuel_only || 0,
      hireCharge: initialData.hire_charge || 0,
      grossRevenue: initialData.gross_revenue || 0,
      customerTotalWithFuel: initialData.customer_total_with_fuel || 0,
      fixedRate: initialData.fixed_rate || 0,
      overtimeCharge: initialData.overtime_charge || 0,
      overnightCharge: initialData.overnight_charge || 0,
      exceedingDistanceCharge: initialData.exceeding_distance_charge || 0,
      pickupDateTime: initialData.pickup_datetime,
      dropDateTime: initialData.drop_datetime,
      commissionPct: initialData.commission_pct || 0,
      commissionAmount: initialData.commission_amount || 0,
      commissionPassThroughPct: initialData.commission_pass_through_pct || 0,
      commissionPassThroughAmount: initialData.commission_pass_through_amount || 0,
      discountType: initialData.discount_percentage > 0 ? 'percentage' : 'amount',
      discountPct: initialData.discount_percentage || 0,
      discountAmount: initialData.discount_amount_lkr || 0,
      driverCharge: initialData.driver_charge || 1500,
      additionalCharges: additionalCharges,
      totalAdditionalCharges: initialData.total_additional_charges || 0,
      otherExpenses: otherExpenses,
      totalExpenses: initialData.total_expenses || 0,
      netProfit: initialData.net_profit || 0,
      numberOfBuses: initialData.number_of_buses || 1,
      // Rate card details for display
      rateCardDetails: {
        standardHours: 8,
        actualHours: initialData.pickup_datetime && initialData.drop_datetime 
          ? Math.round(((new Date(initialData.drop_datetime).getTime() - 
              new Date(initialData.pickup_datetime).getTime()) / (1000 * 60 * 60)) * 100) / 100 
          : 0,
        overtimeHours: 0, // Will be recalculated if needed
        overnightDays: 0,
      }
    });
  }
}, [isEditing, initialData]);
```

---

## Verification Steps

After implementation:

1. **Open an existing quotation for editing** - Form should load with all fields populated
2. **Check "Update" button** - Should be enabled immediately (not disabled)
3. **Submit without changes** - Should work and preserve original calculations
4. **Make a minor change (e.g., phone number)** - Should update without recalculating costs
5. **Make a route change (e.g., pickup location)** - Should trigger recalculation on submit
6. **Check CostBreakdown** - Should display correctly with all values from existing quotation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/SpecialHireForm.tsx` | Add useEffect to initialize costData from initialData when editing |

---

## Impact

- **Low Risk**: Only adds initialization logic, doesn't change calculation or submission flows
- **Backward Compatible**: New quotations unaffected (they still require Calculate Costs)
- **Preserves Data Integrity**: Uses existing "smart recalculation" logic on submit
