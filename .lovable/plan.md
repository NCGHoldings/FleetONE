
# Special Hire Overtime Calculation - Complete System Fix

## Executive Summary
The overtime calculation system has several bugs affecting both **Outside** and **Lyceum** hire types. This plan addresses all issues to ensure accurate time-based charging across the entire Special Hire workflow.

---

## Issues Identified

### Issue 1: Post-Trip Adjustment Uses Wrong Distance for Available Hours
**Location:** `usePostTripAdjustment.ts` line 93-98

**Bug:** The `calculateTimeAdjustment` function passes `actualDistanceKm` to calculate available hours, but available hours should ALWAYS be based on the **original quoted distance**.

```typescript
// CURRENT (BUG)
const actualTimeResult = calculateExtraTimeCharge(
  actualDistanceKm,  // ❌ Wrong - changes available hours baseline
  actualPickupDatetime,
  actualDropDatetime,
  ...
);
```

**Impact:** If a customer travels extra KM, the system incorrectly gives them MORE available time, reducing overtime charges.

**Example:**
- Quoted: 100 km → Available: 10 hours
- Actual: 150 km → Current system calculates Available: 15 hours (WRONG)
- Should be: Available: 10 hours (based on quoted distance)

---

### Issue 2: Lyceum Hire Type Doesn't Calculate Overtime from DateTime
**Location:** `SpecialHireForm.tsx` lines 1175-1196

**Bug:** Only Outside hire calculates overtime using `pickupDateTime` and `dropDateTime`. Lyceum hire type skips this entirely.

```typescript
// CURRENT (BUG)
if (data.hireType === 'Outside') {
  // Only Outside calculates extra time
  const extraTimeResult = calculateExtraTimeCharge(...);
}
// Lyceum: No overtime calculation from datetime!
```

**Impact:** Lyceum hires with trips exceeding `standard_hours` from rate card are NOT being charged overtime.

---

### Issue 3: Lyceum Available Hours Should Use Rate Card Standard Hours
**Location:** `extra-time-calculator.ts`

**Bug:** The calculator only supports distance-based available hours (distance/10 km/h), but Lyceum uses **rate card standard_hours** which varies by KM range.

**Lyceum Rate Card Examples:**
| KM Range | Standard Hours |
|----------|---------------|
| 0-10 km  | 1-2 hours     |
| 11-25 km | 2-4 hours     |
| 26-50 km | 3-4 hours     |
| 51-75 km | 4-8 hours     |

---

### Issue 4: PostTripAdjustmentModal Shows Wrong Available Hours
**Location:** `PostTripAdjustmentModal.tsx` line 457

**Bug:** Displays `actualKm` in the available hours calculation formula instead of the quoted distance.

```tsx
// CURRENT (Misleading)
<div>({actualKm} km ÷ 10 km/h)</div>  // Shows user-entered actual KM
```

---

### Issue 5: Time Adjustment Data Not Populated
**Database Evidence:** Many `special_hire_trip_adjustments` records have:
- `original_quoted_km: 0`
- `actual_hours: 0`
- `extra_hours: 0`

**Cause:** The modal initializes with `originalKm` prop that defaults to 0 if not passed correctly.

---

## Implementation Plan

### Phase 1: Fix Extra Time Calculator to Support Both Hire Types

**File:** `src/lib/extra-time-calculator.ts`

```typescript
export interface ExtraTimeConfig {
  baselineSpeedKmph?: number;
  hourlyRate?: number;
  nightBlockFee?: number;
  // NEW: Support rate card standard hours for Lyceum
  useStandardHours?: boolean;
  standardHours?: number;
}

export function calculateExtraTimeCharge(
  quotedDistanceKm: number,
  pickupDatetime: string | Date,
  dropDatetime: string | Date,
  config: ExtraTimeConfig = {}
): ExtraTimeResult {
  const {
    baselineSpeedKmph = 10,
    hourlyRate = 500,
    nightBlockFee = 3000,
    useStandardHours = false,  // NEW
    standardHours = 8          // NEW
  } = config;

  // Calculate available hours based on hire type
  const availableHours = useStandardHours 
    ? standardHours 
    : quotedDistanceKm / baselineSpeedKmph;

  // ... rest of calculation unchanged
}
```

---

### Phase 2: Fix Post-Trip Adjustment Time Calculation

**File:** `src/hooks/usePostTripAdjustment.ts`

```typescript
const calculateTimeAdjustment = (
  originalDistanceKm: number,
  actualDistanceKm: number,  // Used for display only, not calculation
  originalPickupDatetime: string | Date,
  originalDropDatetime: string | Date,
  actualPickupDatetime: string | Date,
  actualDropDatetime: string | Date,
  config: TimeAdjustmentConfig = {}
): TimeAdjustmentResult => {
  // ...

  // FIX: Use ORIGINAL distance for BOTH calculations
  // Available hours baseline should never change
  const originalTimeResult = calculateExtraTimeCharge(
    originalDistanceKm,  // ✓ Original quoted distance
    originalPickupDatetime,
    originalDropDatetime,
    { ...config }
  );

  // FIX: Still use ORIGINAL distance for available hours
  const actualTimeResult = calculateExtraTimeCharge(
    originalDistanceKm,  // ✓ Use ORIGINAL, not actualDistanceKm
    actualPickupDatetime,
    actualDropDatetime,
    { ...config }
  );

  // ...
}
```

---

### Phase 3: Add Lyceum Overtime Calculation in Quotation Form

**File:** `src/components/special-hire/SpecialHireForm.tsx`

```typescript
// Around line 1175, replace the Outside-only condition:

// Calculate extra time charges for ALL hire types
let overtimeCharge = 0;
let overnightCharge = 0;
let totalExtraTimeCharge = 0;

if (data.hireType === 'Outside') {
  // Outside: distance-based available hours (km / 10)
  const extraTimeResult = calculateExtraTimeCharge(
    totalTripDistanceForCalculation,
    data.pickupDateTime,
    data.dropDateTime,
    {
      baselineSpeedKmph: 10,
      hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
      nightBlockFee: rateCard.overnight_charge_lkr_per_day || 3000,
      useStandardHours: false
    }
  );
  overtimeCharge = extraTimeResult.overtimeCharge;
  overnightCharge = extraTimeResult.overnightCharge;
  totalExtraTimeCharge = extraTimeResult.totalExtraCharge;
} else {
  // Lyceum/Internal: rate card standard_hours based
  const extraTimeResult = calculateExtraTimeCharge(
    tripDistance,  // Not used when useStandardHours=true
    data.pickupDateTime,
    data.dropDateTime,
    {
      hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
      nightBlockFee: rateCard.overnight_charge_lkr_per_day || 3000,
      useStandardHours: true,
      standardHours: rateCard.standard_hours || 8
    }
  );
  overtimeCharge = extraTimeResult.overtimeCharge;
  overnightCharge = extraTimeResult.overnightCharge;
  totalExtraTimeCharge = extraTimeResult.totalExtraCharge;
}
```

---

### Phase 4: Fix PostTripAdjustmentModal

**File:** `src/components/special-hire/PostTripAdjustmentModal.tsx`

1. **Fix available hours display** (line 457):
```tsx
// Use original quoted KM, not actualKm
<div className="text-muted-foreground text-xs">
  ({originalKm} km ÷ 10 km/h)
</div>
```

2. **Fix time adjustment calculation call** (line 168-180):
```typescript
const result = calculateTimeAdjustment(
  originalKm,       // Original quoted distance
  originalKm,       // ✓ Pass originalKm for available hours (not actualKm)
  originalPickupDatetime,
  originalDropDatetime,
  actualPickupDatetime,
  actualDropDatetime,
  { hourlyRate, nightBlockFee }
);
```

3. **Pass hire type and rate card info** to support Lyceum calculations.

---

### Phase 5: Update CostCalculator for Consistency

**File:** `src/components/special-hire/CostCalculator.tsx`

Apply same Lyceum overtime logic using rate card `standard_hours` instead of relying on manual `expectedWorkHours` input.

---

### Phase 6: Update EnhancedCostCalculator Display

**File:** `src/components/special-hire/EnhancedCostCalculator.tsx`

Ensure the recalculation logic for historical records uses:
- Outside: distance-based available hours
- Lyceum: rate card standard_hours based

---

## Files to Modify

| File | Changes |
|------|---------|
| `extra-time-calculator.ts` | Add `useStandardHours` and `standardHours` config options |
| `usePostTripAdjustment.ts` | Fix to use original distance for both calculations |
| `SpecialHireForm.tsx` | Add Lyceum overtime calculation using rate card standard_hours |
| `PostTripAdjustmentModal.tsx` | Fix display and calculation parameters |
| `CostCalculator.tsx` | Apply Lyceum overtime logic consistently |
| `EnhancedCostCalculator.tsx` | Update historical record recalculation |

---

## Calculation Rules Summary

### Outside Hire
| Metric | Formula |
|--------|---------|
| Available Hours | `quoted_distance_km / 10 km/h` |
| Actual Duration | `drop_datetime - pickup_datetime` |
| Extra Hours | `actual_duration - available_hours` |
| Overtime | If extra ≤ 10h: `extra_hours × hourly_rate` |
| Overnight | If extra > 10h: night blocks of 24h at `night_block_fee` |

### Lyceum Hire
| Metric | Formula |
|--------|---------|
| Available Hours | `rate_card.standard_hours` (based on KM range) |
| Actual Duration | `drop_datetime - pickup_datetime` |
| Extra Hours | `actual_duration - standard_hours` |
| Overtime | `extra_hours × overtime_rate_lkr_per_hour` |
| Overnight | `days_beyond_first × overnight_charge_lkr_per_day` |

---

## Testing Checklist

- [ ] Outside hire: 100km trip, 15h duration → expect 5h overtime
- [ ] Lyceum hire: 50km trip (standard 4h), 6h duration → expect 2h overtime
- [ ] Post-trip adjustment: Extra KM doesn't change available hours
- [ ] Historical records: Recalculate correctly from stored datetime
