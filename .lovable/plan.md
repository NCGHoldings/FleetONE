
# Fix: Lyceum Hires Incorrect Pickup-to-Drop Time Reading

## Problem Identified

In `SpecialHireForm.tsx`, there are **hardcoded values** for Lyceum hires that cause incorrect time readings:

| Field | Current (WRONG) | Should Be |
|-------|-----------------|-----------|
| `actualHours` | Hardcoded to `8` for Lyceum | Calculated from pickup/drop times |
| `availableHours` | Distance-based (km/10) for all | Rate card `standard_hours` for Lyceum |
| `overtimeHours` | Hardcoded to `0` for Lyceum | Calculated: actualHours - availableHours |

### Bug Location 1: Cost Calculation (Lines 1328-1332)

```typescript
// CURRENT (BUGGY)
rateCardDetails: {
  standardHours: rateCard.standard_hours || 8,
  actualHours: data.hireType === 'Outside' ? /* calculated */ : 8,  // BUG: Hardcoded 8 for Lyceum
  availableHours: Math.round((tripDistance / 10) * 100) / 100,     // BUG: Same for all hire types
  overtimeHours: data.hireType === 'Outside' ? /* calculated */ : 0, // BUG: Hardcoded 0 for Lyceum
}
```

### Bug Location 2: Edit Initialization (Lines 336-341)

```typescript
// CURRENT (BUGGY)
rateCardDetails: {
  standardHours: 8,                          // BUG: Hardcoded, should use rate card
  actualHours: actualHours,                  // OK
  overtimeHours: Math.max(0, actualHours - 8), // BUG: Uses hardcoded 8
  overnightDays: 0,
}
// Missing: availableHours not set at all
```

---

## Fix Implementation

### Change 1: Fix Cost Calculation Logic

Update lines 1328-1338 to calculate correctly for both hire types:

```typescript
rateCardDetails: {
  standardHours: rateCard.standard_hours || 8,
  // FIXED: Always calculate actual hours from pickup/drop times
  actualHours: Math.round(((new Date(data.dropDateTime).getTime() - new Date(data.pickupDateTime).getTime()) / (1000 * 60 * 60)) * 100) / 100,
  // FIXED: Use rate card standard_hours for Lyceum, distance/10 for Outside
  availableHours: data.hireType === 'Outside' 
    ? Math.round((tripDistance / 10) * 100) / 100 
    : (rateCard.standard_hours || 8),
  // FIXED: Calculate overtime for both hire types
  overtimeHours: (() => {
    const actualHrs = (new Date(data.dropDateTime).getTime() - new Date(data.pickupDateTime).getTime()) / (1000 * 60 * 60);
    const availableHrs = data.hireType === 'Outside' ? (tripDistance / 10) : (rateCard.standard_hours || 8);
    return Math.round(Math.max(0, actualHrs - availableHrs) * 100) / 100;
  })(),
  agreedDistance: baseCoverageKm,
  actualDistance: tripDistance,
  exceedingKm,
  freeExceedingKm: 0,
  chargeableExceedingKm: exceedingKm
}
```

### Change 2: Fix Edit Initialization

Update lines 336-341 to properly initialize rate card details when editing:

```typescript
// First, determine available hours based on hire type
const isLyceumOrInternal = initialData.hire_type === 'Lyceum' || initialData.hire_type === 'Inside';
const storedStandardHours = initialData.standard_hours || 8;
const availableHours = isLyceumOrInternal 
  ? storedStandardHours 
  : ((initialData.km_trip || 0) / 10);

// Then use in rateCardDetails
rateCardDetails: {
  standardHours: storedStandardHours,
  actualHours: actualHours,
  availableHours: Math.round(availableHours * 100) / 100,
  overtimeHours: Math.round(Math.max(0, actualHours - availableHours) * 100) / 100,
  overnightDays: 0,
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/SpecialHireForm.tsx` | Fix lines 336-341 (edit init) and 1328-1338 (cost calc) |

---

## Time Calculation Logic Summary

### Outside Hire
- **Actual Hours**: Pickup to Drop time (always calculated)
- **Available Hours**: Trip Distance / 10 km/h
- **Overtime Hours**: Actual - Available (if positive)

### Lyceum/Internal Hire
- **Actual Hours**: Pickup to Drop time (always calculated)
- **Available Hours**: Rate Card `standard_hours` (4h or 8h blocks)
- **Overtime Hours**: Actual - Standard Hours (if positive)

---

## Expected Outcome

After fix:
1. Lyceum quotations will show correct "Pickup to Drop" time based on actual datetime values
2. Available hours will correctly use rate card's standard_hours for Lyceum hires
3. Overtime calculations will work correctly for all hire types
4. Editing existing quotations will display correct time analysis
