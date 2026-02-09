

# Special Hire Extra-Time Charge Calculation - Bug Fixes

## Problem Summary

After analyzing the codebase, I've identified **5 critical calculation bugs** in the Special Hire system that cause incorrect overtime/overnight charges.

---

## Bug Analysis

### Bug 1: Core Algorithm Error in `extra-time-calculator.ts` (Lines 67-89)

**Current Logic (WRONG):**
```typescript
if (extraHours <= 10) {
  overtimeCharge = extraHours * hourlyRate;  // ≤10h: hourly
} else {
  // >10h: Jump straight to night block then loop
  overnightCharge += nightBlockFee;
  extraHours -= 24;  // BUG: Subtracts 24h but only 10h is the threshold!
  ...
}
```

**Issue:** When extra hours exceed 10 (e.g., 11.5h), the code:
1. Triggers an overnight block (correct)
2. Then subtracts 24 hours, making `extraHours = 11.5 - 24 = -12.5` (WRONG)
3. Loop exits with negative extraHours
4. Returns Rs 3,000 overnight fee when it should be Rs 10,000

**Correct Business Rule:**
- 0-10 extra hours → Hourly rate (Rs 500/hr)
- 10-24 extra hours → 1 overnight block (Rs 10,000)
- 24-34 extra hours → 1 overnight + hourly for remainder
- 34-48 extra hours → 2 overnight blocks
- And so on...

---

### Bug 2: Multi-Bus Path Missing `calculateExtraTimeCharge` (Lines 834-847)

**Location:** `SpecialHireForm.tsx` lines 834-847 (multi-bus fleet mode)

**Current Logic (WRONG):**
```typescript
// Multi-bus path uses manual calculation instead of the library function
const expectedHours = (data.dropDateTime.getTime() - data.pickupDateTime.getTime()) / (1000 * 60 * 60);
const availableHours = tripDistance / 10;
if (expectedHours > availableHours) {
  overtimeCharge = (expectedHours - availableHours) * (rateCard.overtime_rate_lkr_per_hour || 500);
}
// Then separately checks tripDays for overnight
const tripDays = Math.ceil(...);
if (tripDays > 1) {
  overnightCharge = (tripDays - 1) * (rateCard.overnight_charge_lkr_per_day || 3000);
}
```

**Issue:** This bypasses the `calculateExtraTimeCharge` function entirely, using a completely different (broken) algorithm:
- Calculates overtime as simple hourly with no 10h cap
- Calculates overnight based on calendar days, not extra hours
- Results in double-charging when both overtime and overnight apply

---

### Bug 3: Wrong Default Night Block Fee

**Location:** Multiple files use `nightBlockFee = 3000` as default

**Issue:** Rate card database shows `overnight_charge_lkr_per_day = 10000` for Leyland buses, but code defaults to Rs 3,000 when value is missing.

**Affected Files:**
- `extra-time-calculator.ts` line 33
- `PostTripAdjustmentModal.tsx` line 83
- `ConfirmedTripsTable.tsx` line 1686

---

### Bug 4: Rate Card `overnight_charge_lkr_per_day` Not Always Used

**Location:** `SpecialHireForm.tsx` line 1217, 1233

The code correctly passes `nightBlockFee: rateCard.overnight_charge_lkr_per_day || 3000` but only in the single-bus path. Multi-bus path (Bug 2) uses hardcoded 3000.

---

### Bug 5: Incorrect Overnight Logic in displayed quotation

**Observation from Screenshot:**
- Trip: 112.7 km trip
- Available Hours: 11.27 hrs (112.7 km ÷ 10)
- Actual Hours: 22.75 hrs  
- Extra Hours: 11.48 hrs (22.75 - 11.27)
- Displayed Charge: Rs 4,265 (implies ~8.53 hrs × Rs 500)

**Expected:**
- Extra hours = 11.48 hrs (>10h threshold)
- Should trigger 1 overnight block = Rs 10,000

---

## Correct Algorithm

```text
Extra Time Charge Calculation:
┌───────────────────────────────────────────────────────┐
│  Input: extraHours (actualHours - availableHours)     │
│  Input: hourlyRate (e.g., Rs 500/hr)                  │
│  Input: nightBlockFee (e.g., Rs 10,000/day)           │
├───────────────────────────────────────────────────────┤
│  If extraHours <= 0:                                  │
│    Return 0                                           │
│                                                       │
│  If extraHours <= 10:                                 │
│    overtimeCharge = extraHours × hourlyRate           │
│    Return overtimeCharge                              │
│                                                       │
│  If extraHours > 10:                                  │
│    overnightBlocks = ceil(extraHours / 24)            │
│    remainingHours = extraHours - (overnightBlocks×24) │
│                                                       │
│    If remainingHours < 0: remainingHours = 0          │
│    If remainingHours > 10:                            │
│      overnightBlocks += 1                             │
│      remainingHours = 0                               │
│                                                       │
│    overnightCharge = overnightBlocks × nightBlockFee  │
│    overtimeCharge = remainingHours × hourlyRate       │
│    Return overtimeCharge + overnightCharge            │
└───────────────────────────────────────────────────────┘
```

**Examples:**
| Extra Hours | Calculation | Result |
|-------------|-------------|--------|
| 5h | 5 × 500 | Rs 2,500 overtime |
| 10h | 10 × 500 | Rs 5,000 overtime |
| 11.5h | 1 overnight block | Rs 10,000 overnight |
| 20h | 1 overnight block | Rs 10,000 overnight |
| 25h | 1 overnight + 1h hourly | Rs 10,000 + Rs 500 = Rs 10,500 |
| 35h | 2 overnight blocks | Rs 20,000 overnight |

---

## Implementation Plan

### Step 1: Fix Core Algorithm (`extra-time-calculator.ts`)

Rewrite the calculation logic:

```typescript
export function calculateExtraTimeCharge(
  quotedDistanceKm: number,
  pickupDatetime: string | Date,
  dropDatetime: string | Date,
  config: ExtraTimeConfig = {}
): ExtraTimeResult {
  const {
    baselineSpeedKmph = 10,
    hourlyRate = 500,
    nightBlockFee = 10000,  // Fix default to 10,000
    useStandardHours = false,
    standardHours = 8
  } = config;

  const availableHours = useStandardHours 
    ? standardHours 
    : quotedDistanceKm / baselineSpeedKmph;

  const pickupTime = new Date(pickupDatetime).getTime();
  const dropTime = new Date(dropDatetime).getTime();
  const actualHours = Math.max(0, (dropTime - pickupTime) / (1000 * 60 * 60));
  
  const extraHours = Math.max(0, actualHours - availableHours);
  
  if (extraHours === 0) {
    return {
      availableHours: Math.round(availableHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      extraHours: 0,
      overtimeCharge: 0,
      overnightCharge: 0,
      totalExtraCharge: 0
    };
  }

  let overtimeCharge = 0;
  let overnightCharge = 0;

  if (extraHours <= 10) {
    // Simple hourly for up to 10 hours
    overtimeCharge = extraHours * hourlyRate;
  } else {
    // Over 10 hours - use overnight blocks
    // Calculate how many full 24-hour blocks needed
    let remainingHours = extraHours;
    
    while (remainingHours > 10) {
      // Each overnight block covers up to 24 hours
      overnightCharge += nightBlockFee;
      remainingHours -= 24;
    }
    
    // Any remaining hours (if positive and ≤10) are charged hourly
    if (remainingHours > 0) {
      overtimeCharge = remainingHours * hourlyRate;
    }
  }

  return {
    availableHours: Math.round(availableHours * 100) / 100,
    actualHours: Math.round(actualHours * 100) / 100,
    extraHours: Math.round(extraHours * 100) / 100,
    overtimeCharge: Math.round(overtimeCharge),
    overnightCharge: Math.round(overnightCharge),
    totalExtraCharge: Math.round(overtimeCharge + overnightCharge)
  };
}
```

### Step 2: Fix Multi-Bus Path (`SpecialHireForm.tsx` lines 834-847)

Replace manual calculation with `calculateExtraTimeCharge`:

```typescript
if (data.hireType === 'Outside') {
  // ... existing rate card logic ...
  
  // FIX: Use calculateExtraTimeCharge instead of manual calculation
  const extraTimeResult = calculateExtraTimeCharge(
    tripDistance,
    data.pickupDateTime,
    data.dropDateTime,
    {
      baselineSpeedKmph: 10,
      hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
      nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
      useStandardHours: false
    }
  );
  
  overtimeCharge = extraTimeResult.overtimeCharge;
  overnightCharge = extraTimeResult.overnightCharge;
  hireChargePerBus += extraTimeResult.totalExtraCharge;
}
```

### Step 3: Update Default Night Block Fee

Update all hardcoded defaults from `3000` to `10000`:

| File | Line | Change |
|------|------|--------|
| `extra-time-calculator.ts` | 33 | `nightBlockFee = 10000` |
| `PostTripAdjustmentModal.tsx` | 83 | `nightBlockFee = 10000` |
| `ConfirmedTripsTable.tsx` | 1686 | `nightBlockFee={10000}` |
| `usePostTripAdjustment.ts` | 84 | `nightBlockFee = 10000` |
| `EnhancedCostCalculator.tsx` | 346, 361 | `nightBlockFee: rateCard?.overnight_charge_lkr_per_day || 10000` |

### Step 4: Add Lyceum/Internal Overtime Support to Multi-Bus Path

The multi-bus fleet path (lines 848-865) lacks overtime calculation for Lyceum/Internal hires entirely. Add:

```typescript
} else {
  // Lyceum/Internal: range-based rates
  rateCard = allRateCards.find(card => ...);
  hireChargePerBus = rateCard?.flat_fee_lkr || 0;

  // FIX: Add overtime calculation for Lyceum/Internal
  const extraTimeResult = calculateExtraTimeCharge(
    tripDistance,
    data.pickupDateTime,
    data.dropDateTime,
    {
      hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
      nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
      useStandardHours: true,
      standardHours: rateCard.standard_hours || 8
    }
  );
  
  overtimeCharge = extraTimeResult.overtimeCharge;
  overnightCharge = extraTimeResult.overnightCharge;
  hireChargePerBus += extraTimeResult.totalExtraCharge;
  
  // Handle exceeding km...
}
```

---

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/lib/extra-time-calculator.ts` | Fix core algorithm (lines 67-89) |
| 2 | `src/components/special-hire/SpecialHireForm.tsx` | Fix multi-bus path (lines 834-865) |
| 3 | `src/components/special-hire/PostTripAdjustmentModal.tsx` | Update default nightBlockFee |
| 4 | `src/components/special-hire/ConfirmedTripsTable.tsx` | Update default nightBlockFee |
| 5 | `src/hooks/usePostTripAdjustment.ts` | Update default nightBlockFee |
| 6 | `src/components/special-hire/EnhancedCostCalculator.tsx` | Update default nightBlockFee |

---

## Verification Test Cases

After fixes, these scenarios should calculate correctly:

| Scenario | Trip KM | Available Hrs | Actual Hrs | Extra Hrs | Expected Charge |
|----------|---------|---------------|------------|-----------|-----------------|
| Under 10h extra | 100 | 10 | 15 | 5 | Rs 2,500 overtime |
| Exactly 10h extra | 100 | 10 | 20 | 10 | Rs 5,000 overtime |
| Just over 10h | 112.7 | 11.27 | 22.75 | 11.48 | Rs 10,000 overnight |
| 20h extra | 50 | 5 | 25 | 20 | Rs 10,000 overnight |
| 25h extra | 50 | 5 | 30 | 25 | Rs 10,500 (overnight + 1h) |
| 35h extra | 50 | 5 | 40 | 35 | Rs 20,000 (2 overnight) |
| Multi-day 50h extra | 50 | 5 | 55 | 50 | Rs 21,000 (2 overnight + 2h) |

