
# Post-Trip Adjustment Time Tracking - Complete Fix Plan

## Problem Summary

Based on my investigation, I found that the Post-Trip Adjustment feature is **missing critical time tracking functionality**:

### Current Limitations:
| Feature | Status | Impact |
|---------|--------|--------|
| Actual KM input | Working | Extra KM charges calculated correctly |
| Additional expenses | Working | Toll, parking, etc. can be added |
| Actual pickup/drop time | **MISSING** | No way to capture actual trip timing |
| Overtime recalculation | **MISSING** | Cannot adjust overtime based on actual hours |
| Overnight recalculation | **MISSING** | Cannot adjust overnight charges post-trip |

### Evidence from Screenshots:
- "Working Hours Analysis" shows **0.0 hrs Actual** - this is incorrect
- The quotation has pickup/drop times, but actual trip timing differs
- No UI exists to input "Actual Pickup Time" or "Actual Drop Time" after the trip

---

## Root Cause Analysis

### Issue 1: Database Schema Missing Time Fields
The `special_hire_trip_adjustments` table only has distance-related columns:
- `actual_km_traveled`, `extra_km`, `extra_km_total_charge`

But lacks time-related columns:
- `actual_pickup_datetime`, `actual_drop_datetime`
- `actual_hours_traveled`, `extra_hours`
- `overtime_charge_adjustment`, `overnight_charge_adjustment`

### Issue 2: PostTripAdjustmentModal Missing Time UI
The modal has sections for:
- Kilometer Adjustment
- Additional Expenses

But no section for:
- Time Adjustment (actual pickup/drop times)
- Overtime/Overnight recalculation

### Issue 3: Calculation Hook Missing Time Logic
The `usePostTripAdjustment.calculateTotals()` only calculates:
- Extra KM charge
- Additional expenses

But doesn't calculate:
- Overtime adjustment based on actual hours
- Overnight adjustment for extended trips

---

## Implementation Plan

### Part 1: Database Migration - Add Time Fields

Add new columns to `special_hire_trip_adjustments` table:

| Column | Type | Purpose |
|--------|------|---------|
| `original_pickup_datetime` | TIMESTAMPTZ | Store original quoted pickup time |
| `original_drop_datetime` | TIMESTAMPTZ | Store original quoted drop time |
| `actual_pickup_datetime` | TIMESTAMPTZ | User-input actual pickup time |
| `actual_drop_datetime` | TIMESTAMPTZ | User-input actual drop time |
| `original_hours` | NUMERIC | Calculated from quoted times |
| `actual_hours` | NUMERIC | Calculated from actual times |
| `extra_hours` | NUMERIC | actual_hours - available_hours |
| `overtime_charge_adjustment` | NUMERIC | Recalculated overtime charge |
| `overnight_charge_adjustment` | NUMERIC | Recalculated overnight charge |
| `total_time_adjustment` | NUMERIC | Sum of overtime + overnight adjustments |

### Part 2: Update TripAdjustment Interface

Modify `usePostTripAdjustment.ts` to include:
- New time-related fields in the `TripAdjustment` interface
- New `calculateTimeAdjustment()` function using the existing `calculateExtraTimeCharge` utility
- Updated `calculateTotals()` to include time charges in the adjustment amount

### Part 3: Add Time Adjustment Section to Modal

Enhance `PostTripAdjustmentModal.tsx` with:
- "Time Adjustment" section after "Kilometer Adjustment"
- DateTime pickers for Actual Pickup Time and Actual Drop Time
- Display calculated fields:
  - Original Hours (from quoted times)
  - Actual Hours (from actual times)
  - Available Hours (distance / 10 km/h)
  - Extra Hours (actual - available)
- Automatic recalculation of overtime/overnight charges
- Visual comparison showing original vs. adjusted time charges

### Part 4: Update Final Calculation Summary

Modify the "Final Calculation" section in the modal to:
- Show original overtime/overnight from quotation
- Show adjusted overtime/overnight from actual times
- Show time adjustment amount (difference)
- Include time adjustment in total adjustment amount

### Part 5: Update CostBreakdown Display

Enhance the "Post-Trip Adjustments" section in `CostBreakdown.tsx` to:
- Display actual vs. quoted time comparison
- Show time-based adjustment amounts separately
- Update "Working Hours Analysis" to use actual times when adjustment exists

### Part 6: Update Props Passed to Modal

Modify the component that opens `PostTripAdjustmentModal` to pass:
- `originalPickupDatetime` - from quotation
- `originalDropDatetime` - from quotation
- `originalOvertimeCharge` - from quotation
- `originalOvernightCharge` - from quotation

---

## Technical Implementation Details

### Time Adjustment Calculation Logic

Using the existing `calculateExtraTimeCharge()` function:

```typescript
// Original quotation calculation
const originalTimeResult = calculateExtraTimeCharge(
  quotedDistanceKm,
  originalPickupDatetime,
  originalDropDatetime,
  { hourlyRate: 500, nightBlockFee: 3000 }
);

// Post-trip actual calculation
const actualTimeResult = calculateExtraTimeCharge(
  actualKmTraveled,  // Use actual distance for available hours
  actualPickupDatetime,
  actualDropDatetime,
  { hourlyRate: 500, nightBlockFee: 3000 }
);

// Calculate adjustment
const timeAdjustment = {
  overtimeAdjustment: actualTimeResult.overtimeCharge - originalTimeResult.overtimeCharge,
  overnightAdjustment: actualTimeResult.overnightCharge - originalTimeResult.overnightCharge,
  totalTimeAdjustment: actualTimeResult.totalExtraCharge - originalTimeResult.totalExtraCharge
};
```

### UI Flow

```text
User opens Post-Trip Adjustment
    ↓
Sees original pickup/drop times (read-only)
    ↓
Enters actual pickup/drop times
    ↓
System calculates:
  - Actual hours vs. Available hours
  - New overtime charge
  - New overnight charge
  - Difference from original
    ↓
Time adjustment added to total adjustment
    ↓
Final amount = Original + KM adjustment + Time adjustment + Expenses
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new]_add_time_adjustment_fields.sql` | Add time-related columns |
| `src/hooks/usePostTripAdjustment.ts` | Add time calculation functions, update interfaces |
| `src/components/special-hire/PostTripAdjustmentModal.tsx` | Add time adjustment UI section |
| `src/components/special-hire/CostBreakdown.tsx` | Display time adjustments in breakdown |
| `src/integrations/supabase/types.ts` | Update generated types |

---

## UI Mockup for Time Adjustment Section

```text
┌─────────────────────────────────────────────────────────────┐
│ 🕐 Time Adjustment                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Original Pickup     │  │ Actual Pickup       │          │
│  │ Jan 23, 2026 09:00  │  │ [DateTimePicker]    │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Original Drop       │  │ Actual Drop         │          │
│  │ Jan 23, 2026 17:00  │  │ [DateTimePicker]    │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Time Analysis:                                             │
│  • Available Hours: 19.9 hrs (199.4 km ÷ 10 km/h)          │
│  • Original Hours:  8.0 hrs (09:00 - 17:00)                │
│  • Actual Hours:   10.5 hrs (08:30 - 19:00)                │
│  • Extra Hours:     0.0 hrs (no overtime - within limit)   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Time Charges Comparison:                                   │
│                         Original    Actual    Adjustment   │
│  Overtime:              LKR 0       LKR 0     LKR 0        │
│  Overnight:             LKR 0       LKR 0     LKR 0        │
│  ─────────────────────────────────────────────────────     │
│  Time Adjustment:                             LKR 0        │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Steps

After implementation:

1. **Create adjustment with time change** - Trip ran 2 hours longer than quoted
2. **Verify overtime recalculation** - Should show additional overtime charge
3. **Create multi-day adjustment** - Trip extended overnight
4. **Verify overnight recalculation** - Should show overnight block fee
5. **Check CostBreakdown** - Should show actual hours instead of 0.0 hrs
6. **Check final calculation** - Time adjustment should be included in balance due
7. **Generate balance invoice** - Time adjustments should appear on invoice
