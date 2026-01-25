
# Special Hire Calculation & Display Issues - Complete Fix Plan

## Executive Summary

After thorough cross-checking of the Special Hire calculation flow, I identified **4 critical issues** causing time calculations and overnight charges to not display correctly, plus inconsistencies in the quotation/invoice document flow.

---

## Issues Identified

### Issue 1: Missing Database Columns for Time Charges
**Problem**: The `special_hire_quotations` table lacks dedicated columns for `overtime_charge` and `overnight_charge`. These values are bundled into `extra_charges` during save, but lost when retrieving data for display.

**Evidence**: Database query confirmed only `extra_charges` column exists - no individual overtime/overnight columns.

### Issue 2: EnhancedCostCalculator References Non-Existent Columns
**Problem**: Lines 335-336 in `EnhancedCostCalculator.tsx` reference `quotation.overtime_charge` and `quotation.overnight_charge` which return undefined/0.

```typescript
// Current (BROKEN)
overtimeCharge: quotation.overtime_charge || 0,  // Always 0
overnightCharge: quotation.overnight_charge || 0, // Always 0
```

### Issue 3: CostBreakdown Working Hours Display Fallback Logic
**Problem**: When `rateCardDetails` is not fully populated (e.g., viewing saved quotations), the working hours analysis falls back to incomplete calculations that don't match the original business logic.

### Issue 4: QuotationPreview Missing Time Breakdown
**Problem**: Customer-facing quotation document shows only "Subtotal" and "Final Total" without listing the overtime/overnight components that contributed to those totals. The "Description" column shows static "Route Details" placeholder.

---

## Implementation Plan

### Part 1: Add Database Columns for Time Charges

Create a migration to add `overtime_charge`, `overnight_charge`, and `fixed_rate` columns to `special_hire_quotations`:

```sql
ALTER TABLE special_hire_quotations 
ADD COLUMN IF NOT EXISTS overtime_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overnight_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exceeding_distance_charge NUMERIC DEFAULT 0;
```

### Part 2: Update SpecialHireForm.tsx to Save Individual Charges

Modify the quotation save logic (around line 1514) to include:
- `overtime_charge`
- `overnight_charge`
- `fixed_rate`
- `exceeding_distance_charge`

### Part 3: Fix EnhancedCostCalculator.tsx Recalculation

Update the cost data mapping (lines 328-337) to:
1. First try to use stored values from database
2. If not available, recalculate using `calculateExtraTimeCharge()` function with stored datetime and distance

```typescript
// Recalculate if not stored
const extraTimeResult = calculateExtraTimeCharge(
  quotation.km_trip || 0,
  quotation.pickup_datetime,
  quotation.drop_datetime,
  { baselineSpeedKmph: 10, hourlyRate: rateCard?.overtime_rate_lkr_per_hour || 500, nightBlockFee: rateCard?.overnight_charge_lkr_per_day || 3000 }
);

overtimeCharge: quotation.overtime_charge || extraTimeResult.overtimeCharge,
overnightCharge: quotation.overnight_charge || extraTimeResult.overnightCharge,
```

### Part 4: Update QuotationPreview.tsx with Time Breakdown

Add a new "Time Analysis" section to the customer document showing:
- Trip Duration (pickup to drop)
- Available Hours (distance / 10 km/h)
- Overtime Hours (if applicable)
- Overnight Days (if applicable)
- Individual charge amounts

### Part 5: Update QuotationData Interface

Add the new fields to the interface in `QuotationPreview.tsx` and `useRealtimeSpecialHire.ts`:
- `overtime_charge?: number`
- `overnight_charge?: number`
- `fixed_rate?: number`
- `exceeding_distance_charge?: number`

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new]_add_time_charge_columns.sql` | Add 4 new columns |
| `src/components/special-hire/SpecialHireForm.tsx` | Save individual charge values |
| `src/components/special-hire/EnhancedCostCalculator.tsx` | Recalculate from stored or compute |
| `src/components/special-hire/QuotationPreview.tsx` | Add time breakdown section |
| `src/components/special-hire/CostBreakdown.tsx` | Improve fallback calculations |
| `src/hooks/useRealtimeSpecialHire.ts` | Add new fields to interface |
| `src/integrations/supabase/types.ts` | Update generated types |

---

## Verification Steps

After implementation, verify with these checks:

1. **Create new Outside hire quotation** with multi-day trip - confirm overtime/overnight display in CostBreakdown
2. **View saved quotation** - confirm time analysis displays correctly
3. **Generate QuotationPreview PDF** - confirm customer document shows charge breakdown
4. **Generate Balance Invoice** - confirm charges flow through correctly
5. **Check database** - confirm new columns populated with correct values

---

## Technical Details

### Overtime/Overnight Calculation Rules (from extra-time-calculator.ts)

- **Available Hours** = Trip Distance / 10 km/h
- **Extra Hours** = Actual Hours - Available Hours
- **If Extra Hours <= 10**: Charge hourly rate per hour
- **If Extra Hours > 10**: Charge night block fee (3000 LKR) per 24h, remaining hours charged hourly

### Data Flow

```text
Form Calculation -> Save to DB (with individual columns) -> Retrieve -> Display in CostBreakdown/Preview
```

This ensures the calculated values are persisted and don't need recalculation on display, eliminating discrepancies.
