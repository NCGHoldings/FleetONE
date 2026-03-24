

# Fix: `km_trip` in costs object still uses original distance instead of override

## Problem
Even though the previous fix correctly applied the manual override to `tripDistance` for rate card calculations (line 1252), the **costs object** at line 1418 still writes the original Google Maps distance:

```typescript
// Line 1418 (BUG):
km_trip: Math.round((distanceData.kmTrip || 0) * 10) / 10,  // ← ignores manual override
```

This means when the quotation is saved, `km_trip` gets corrected at line 1759 (`useManualTripDistance ? manualTripDistance : costs.km_trip`), but:
1. The **display data** (`costData`) at line 1459 still shows the old `costs.km_trip`
2. `totalTripDistance` and `totalDistance` at lines 1504-1505 use `distanceData.kmTrip` directly
3. When editing/versioning, the recalculated costs carry the wrong `km_trip` in the costs object

## Fix

### File: `src/components/special-hire/SpecialHireForm.tsx`

Three changes using the already-computed `tripDistance` variable:

1. **Line 1418**: Use `tripDistance` instead of `distanceData.kmTrip`
```typescript
km_trip: tripDistance,  // already rounded, uses manual override if enabled
```

2. **Line 1504**: Use `tripDistance` for totalTripDistance
```typescript
totalTripDistance: (distanceData.kmParkingToPickup || 0) + tripDistance + (distanceData.kmDropToParking || 0),
```

3. **Line 1505**: Use `tripDistance` for totalDistance
```typescript
totalDistance: (distanceData.kmParkingToPickup || 0) + tripDistance + (distanceData.kmDropToParking || 0) + totalAdditionalDistance,
```

These three lines are the remaining places where the original `distanceData.kmTrip` is used instead of the override-aware `tripDistance`.

