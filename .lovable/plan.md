

# Fix: Manual Trip Distance Override Not Recalculating Exceeding Distance Charge

## Problem
When the user overrides the trip distance (e.g., from 222 km to 274 km), the **exceeding distance charge is not recalculated**. The stored charge (LKR 19,565) reflects the old distance, not 174 km × 175 LKR/km = LKR 30,450.

**Root cause**: In `SpecialHireForm.tsx`, the submit handler at line 1251 always uses `distanceData.kmTrip` (Google Maps result) for all rate card calculations. The manual override (`manualTripDistance`) is only applied at save time for the `km_trip` field, but `exceeding_distance_charge`, `hire_charge`, `gross_revenue`, and all downstream values (fuel, commission, customer total) are computed from the original distance.

## Fix

### File: `src/components/special-hire/SpecialHireForm.tsx`

**Change at line 1251**: Apply the manual trip distance override immediately before rate card calculations:

```typescript
// BEFORE (bug):
const tripDistance = Math.round((distanceData.kmTrip || 0) * 10) / 10;

// AFTER (fix):
const calculatedTripDistance = Math.round((distanceData.kmTrip || 0) * 10) / 10;
const tripDistance = useManualTripDistance && manualTripDistance > 0
  ? manualTripDistance
  : calculatedTripDistance;
```

This single change ensures all downstream calculations (exceeding distance, overtime, fuel, commission, customer total) use the overridden distance when manual override is enabled.

### Also verify `EnhancedCostCalculator.tsx` line 301
Currently it recalculates exceeding distance from `quotation.km_trip` and the rate card, but then at line 343 it prefers `quotation.exceeding_distance_charge` (the stored value). Since the stored value will now be correct after the form fix, this will work. But as a safety measure, always recalculate from `km_trip` instead of using the stored value:

```typescript
// Line 343: BEFORE
const storedExceedingDistanceCharge = quotation.exceeding_distance_charge ?? exceedingDistanceCharge;

// AFTER: Always use recalculated value based on km_trip
const storedExceedingDistanceCharge = exceedingDistanceCharge;
```

## Files Changed
- `src/components/special-hire/SpecialHireForm.tsx` — apply manual distance before calculations
- `src/components/special-hire/EnhancedCostCalculator.tsx` — always recalculate exceeding charge from km_trip

