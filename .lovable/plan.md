
# Special Hire Calculation Bug Fixes - Complete System Audit

## Executive Summary

After comprehensive analysis of the Special Hire calculation system, I've identified **8 remaining bugs** that cause incorrect overtime/overnight calculations. The previous fix updated some files but missed several critical calculation paths.

---

## Identified Issues

### Issue 1: Default Night Block Fee Still Wrong in Multiple Files

**Locations still using Rs 3,000 instead of Rs 10,000:**

| File | Line | Current Value | Should Be |
|------|------|---------------|-----------|
| `SpecialHireForm.tsx` | 1236 | `3000` | `10000` |
| `SpecialHireForm.tsx` | 1252 | `3000` | `10000` |
| `SpecialHireForm.tsx` | 2296 | `3000` | `10000` |
| `SpecialHireForm.tsx` | 2310 | `3000` | `10000` |
| `CostCalculator.tsx` | 144 | `3000` | `10000` |
| `CostCalculator.tsx` | 149 | `3000` | `10000` |
| `CostCalculator.tsx` | 428 | `3000` | `10000` |
| `CostCalculator.tsx` | 434 | `3000` | `10000` |
| `TripDetailsModal.tsx` | 358 | `3000` | `10000` |

**Impact:** When rate card doesn't have `overnight_charge_lkr_per_day` set, system defaults to Rs 3,000 instead of Rs 10,000.

---

### Issue 2: CostCalculator.tsx Uses Legacy Calculation Algorithm

**Problem:** `CostCalculator.tsx` (lines 141-156 and 424-440) implements its own overtime/overnight logic instead of using the corrected `calculateExtraTimeCharge` function.

**Current broken logic:**
```typescript
if (extraHours <= 10) {
  overtimeCharge = extraHours * 500;
} else {
  overnightCharge += 3000;  // Wrong default
  let remaining = extraHours - 24;  // Wrong subtraction
  while (remaining > 0) {
    if (remaining > 10) {
      overnightCharge += 3000;
      remaining -= 24;
    } else {
      overtimeCharge += remaining * 500;
      remaining = 0;
    }
  }
}
```

**Issue:** This subtracts 24 after the first block but only 10 hours triggered it - same bug we fixed in `extra-time-calculator.ts`.

---

### Issue 3: Manual Trip Distance Recalculation Uses Wrong Default

**Location:** `SpecialHireForm.tsx` lines 2296 and 2310

When user manually overrides trip distance and clicks "Recalculate", the overtime/overnight calculation uses `3000` as default night block fee.

---

### Issue 4: Single-Bus Path Uses Wrong Default

**Location:** `SpecialHireForm.tsx` lines 1236 and 1252

The main single-bus calculation path (inside `calculateCosts()`) uses `3000` as the fallback night block fee.

---

### Issue 5: TripDetailsModal Passes Wrong Default to PostTripAdjustmentModal

**Location:** `TripDetailsModal.tsx` line 358

When opening post-trip adjustment from trip details, it passes `nightBlockFee={3000}` if the quotation doesn't have the rate stored.

---

### Issue 6: Verified Files (Already Fixed)

These files are already using the correct `10000` default:

- `extra-time-calculator.ts` - Core algorithm (line 33)
- `SpecialHireForm.tsx` multi-bus path (lines 842, 866)
- `EnhancedCostCalculator.tsx` (lines 346, 361)
- `PostTripAdjustmentModal.tsx` (line 83)
- `ConfirmedTripsTable.tsx` (line 1686)
- `usePostTripAdjustment.ts` (line 84)

---

## Complete Fix Plan

### Step 1: Fix SpecialHireForm.tsx Single-Bus Path (4 locations)

Update lines 1236, 1252, 2296, 2310 to use `10000` instead of `3000`:

```typescript
// Line 1236 - Outside hire single bus
nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,

// Line 1252 - Lyceum/Internal single bus  
nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,

// Line 2296 - Manual trip recalculation (Outside)
nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,

// Line 2310 - Manual trip recalculation (Lyceum/Internal)
nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
```

### Step 2: Fix CostCalculator.tsx (Replace Legacy Algorithm)

Replace the manual calculation loops (lines 141-156 and 424-440) with `calculateExtraTimeCharge`:

**Import at top of file:**
```typescript
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';
```

**Replace multi-bus loop (lines 141-156):**
```typescript
// Calculate overtime/overnight charges using standard function
if (formData.expectedWorkHours && formData.expectedWorkHours > 0) {
  const availableHours = tripDistance / 10;
  const extraTimeResult = calculateExtraTimeCharge(
    tripDistance,
    new Date(), // Start time (placeholder - will use expectedWorkHours)
    new Date(Date.now() + formData.expectedWorkHours * 60 * 60 * 1000), // End time
    {
      baselineSpeedKmph: 10,
      hourlyRate: rateCard.overtime_rate_lkr_per_hour || 500,
      nightBlockFee: rateCard.overnight_charge_lkr_per_day || 10000,
      useStandardHours: false
    }
  );
  overtimeChargePerBus = extraTimeResult.overtimeCharge;
  overnightChargePerBus = extraTimeResult.overnightCharge;
}
```

**Replace single-bus loop (lines 424-440):**
Same pattern - use `calculateExtraTimeCharge` with `10000` default.

### Step 3: Fix TripDetailsModal.tsx

Update line 358 to use correct default:
```typescript
nightBlockFee={(trip.quotation as any).overnight_charge_lkr_per_day || 10000}
```

---

## Files to Modify

| # | File | Changes | Priority |
|---|------|---------|----------|
| 1 | `src/components/special-hire/SpecialHireForm.tsx` | Fix 4 occurrences of `3000` → `10000` (lines 1236, 1252, 2296, 2310) | Critical |
| 2 | `src/components/special-hire/CostCalculator.tsx` | Import `calculateExtraTimeCharge`, replace 2 manual loops, fix 4 occurrences of `3000` → `10000` | Critical |
| 3 | `src/components/special-hire/TripDetailsModal.tsx` | Fix 1 occurrence of `3000` → `10000` (line 358) | High |

---

## Verification Test Cases

After all fixes, these scenarios should calculate correctly:

| Extra Hours | Expected Overtime | Expected Overnight | Total Charge |
|-------------|-------------------|-------------------|--------------|
| 5h | Rs 2,500 | Rs 0 | Rs 2,500 |
| 10h | Rs 5,000 | Rs 0 | Rs 5,000 |
| 11h | Rs 0 | Rs 10,000 | Rs 10,000 |
| 11.48h (your example) | Rs 0 | Rs 10,000 | Rs 10,000 |
| 20h | Rs 0 | Rs 10,000 | Rs 10,000 |
| 25h | Rs 500 | Rs 10,000 | Rs 10,500 |
| 35h | Rs 0 | Rs 20,000 | Rs 20,000 |
| 50h | Rs 1,000 | Rs 20,000 | Rs 21,000 |

---

## Manual KM Override Flow - Complete Process

When user enables "Manual Trip Distance Override":

```text
┌─────────────────────────────────────────────────────────────┐
│  1. User toggles "Manual Trip Distance Override" ON         │
│     → System initializes manual distance with current value │
│     → Original calculated distance stored for reset         │
├─────────────────────────────────────────────────────────────┤
│  2. User enters new manual trip distance (e.g., 150 km)     │
│     → No automatic recalculation yet                        │
├─────────────────────────────────────────────────────────────┤
│  3. User clicks "Recalculate with Manual Trip Distance"     │
│     → Re-fetch rate cards for bus type                      │
│     → Re-match rate card based on NEW distance              │
│     → Recalculate:                                          │
│       • Fixed rate (from matched rate card)                 │
│       • Exceeding KM charge (if > 100km threshold)          │
│       • Overtime/Overnight charges (using correct 10,000)   │
│       • Fuel cost (empty run only)                          │
│       • Commission amounts                                   │
│     → Update costData with all new values                   │
├─────────────────────────────────────────────────────────────┤
│  4. User submits quotation                                  │
│     → Manual distance saved to km_trip column               │
│     → uses_manual_trip_distance = true                      │
│     → manual_km_trip = entered value                        │
│     → All recalculated costs saved correctly                │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This fix ensures calculation consistency across ALL paths in the system:
- Single-bus quotations
- Multi-bus fleet quotations  
- Manual parking distance override
- Manual trip distance override
- Post-trip adjustments
- Cost calculator component
- Trip details modal

After implementing these changes, the overnight charge for 11.48 extra hours will correctly show Rs 10,000 instead of the incorrect Rs 4,265 (or Rs 3,000).
