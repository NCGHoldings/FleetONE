
# Special Hire Overtime/Overnight Calculation Complete Fix Plan

## Problem Summary

Based on my investigation, I found **3 critical issues** causing overtime/overnight charges to not display correctly:

### Issue 1: EnhancedCostCalculator Missing Recalculation Logic
**Problem**: When stored values are 0 (for existing quotations or newly migrated data), the calculator doesn't fall back to recalculating using `calculateExtraTimeCharge`.

**Evidence from Code (lines 332-335)**:
```typescript
const storedOvertimeCharge = quotation.overtime_charge || 0;  // Falls back to 0, not recalculation
const storedOvernightCharge = quotation.overnight_charge || 0; // Falls back to 0, not recalculation
```

### Issue 2: Missing Import in EnhancedCostCalculator
**Problem**: The `calculateExtraTimeCharge` function is not imported in `EnhancedCostCalculator.tsx`, so it cannot perform the fallback recalculation.

### Issue 3: Historical Data Has No Charges Stored
**Problem**: All existing quotations in database have `overtime_charge = 0`, `overnight_charge = 0`, `fixed_rate = 0` because these columns were just added with default values.

**Database Evidence**:
| Quotation | Trip KM | Pickup | Drop | Extra Charges | Overtime | Overnight | Fixed Rate |
|-----------|---------|--------|------|---------------|----------|-----------|------------|
| QUO-2026-0944 | 375.6 | Jan 23 00:00 | Jan 25 15:30 | 15000 | **0** | **0** | **0** |
| QUO-2026-0862 | 231.6 | Jan 12 00:30 | Jan 13 16:30 | 10000 | **0** | **0** | **0** |
| QUO-2026-0796 | 657.1 | Jan 08 00:30 | Jan 10 17:30 | 0 | **0** | **0** | **0** |

---

## Implementation Plan

### Step 1: Update EnhancedCostCalculator.tsx - Add Import

Add the `calculateExtraTimeCharge` import at the top of the file:

```typescript
import { calculateExtraTimeCharge } from '@/lib/extra-time-calculator';
```

### Step 2: Update EnhancedCostCalculator.tsx - Add Recalculation Fallback

Modify the `displayOriginalCostBreakdown` function (around line 330-335) to:
1. Check if stored values are 0 AND the hire type is "Outside"
2. If so, recalculate using `calculateExtraTimeCharge`
3. Use rate card rates if available, otherwise use defaults

**Updated Logic**:
```typescript
// Recalculate overtime/overnight for Outside hire if not stored
let storedOvertimeCharge = quotation.overtime_charge || 0;
let storedOvernightCharge = quotation.overnight_charge || 0;

// If charges are 0 and this is an Outside hire, recalculate
if (quotation.hire_type === 'Outside' && 
    storedOvertimeCharge === 0 && 
    storedOvernightCharge === 0 && 
    quotation.pickup_datetime && 
    quotation.drop_datetime) {
  
  const extraTimeResult = calculateExtraTimeCharge(
    tripDistance,
    quotation.pickup_datetime,
    quotation.drop_datetime,
    {
      baselineSpeedKmph: 10,
      hourlyRate: rateCard?.overtime_rate_lkr_per_hour || 500,
      nightBlockFee: rateCard?.overnight_charge_lkr_per_day || 3000
    }
  );
  
  storedOvertimeCharge = extraTimeResult.overtimeCharge;
  storedOvernightCharge = extraTimeResult.overnightCharge;
}
```

### Step 3: Update CostBreakdown.tsx - Add Overtime/Overnight Info to Working Hours

Enhance the Working Hours Analysis section to show:
- Extra hours (if > 0)
- Whether overtime or overnight applies
- The specific charge type breakdown

**Add after the Available/Actual hours display**:
```typescript
{/* Extra Time Charges Info */}
{(safeData.overtimeCharge > 0 || safeData.overnightCharge > 0) && (
  <div className="mt-3 p-2 bg-orange-50 rounded-md border border-orange-200">
    <div className="text-sm font-medium text-orange-700 mb-1">Extra Time Charges</div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      {safeData.overtimeCharge > 0 && (
        <div className="flex justify-between">
          <span>Overtime</span>
          <span className="font-medium">LKR {safeData.overtimeCharge.toLocaleString()}</span>
        </div>
      )}
      {safeData.overnightCharge > 0 && (
        <div className="flex justify-between">
          <span>Overnight</span>
          <span className="font-medium">LKR {safeData.overnightCharge.toLocaleString()}</span>
        </div>
      )}
    </div>
  </div>
)}
```

### Step 4: Update QuotationPreview.tsx - Ensure Time Charges Display

Verify the QuotationPreview component correctly displays overtime and overnight in the customer-facing quotation document.

### Step 5: Database Migration - Backfill Historical Data

Create a migration to update existing confirmed quotations with correct overtime/overnight values:

```sql
-- Note: This requires a server-side calculation since we can't call JS functions from SQL
-- The fix in EnhancedCostCalculator will handle display for existing data
-- New quotations will save values correctly going forward

-- For now, just ensure columns exist and have correct defaults
-- The frontend recalculation handles historical data display
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/EnhancedCostCalculator.tsx` | Add import + recalculation fallback logic |
| `src/components/special-hire/CostBreakdown.tsx` | Add extra time charges info to Working Hours section |
| `src/components/special-hire/QuotationPreview.tsx` | Verify time charges section displays correctly |

---

## How This Fixes the Issues

### Issue: "Quotation creation time shows but calculator page doesn't"
**Fix**: EnhancedCostCalculator will now recalculate overtime/overnight charges from stored datetime/distance when the stored values are 0.

### Issue: "Overnight charges don't show"
**Fix**: 
1. Recalculation logic will compute correct overnight charges for multi-day trips
2. CostBreakdown will display the charges in "Hire Charges Breakdown" section (already implemented at lines 420-425)
3. New "Extra Time Charges" summary added to Working Hours section for clarity

### Issue: "Should add overnight or not?"
**Answer**: YES - overnight charges should absolutely be added when:
- Extra hours exceed 10 hours (then a night block fee of LKR 3,000 per 24h is charged)
- The existing business logic in `extra-time-calculator.ts` already handles this correctly
- The issue was only that the calculator page wasn't recalculating for existing data

---

## Verification Steps

After implementation:

1. **View existing quotation in Calculator tab** - Should now show correct overtime/overnight charges
2. **Create new Outside hire quotation** spanning multiple days - Verify charges display during creation AND in calculator
3. **Check Working Hours Analysis** - Should show breakdown of extra time charges
4. **Verify Hire Charges Breakdown** - Should list overtime/overnight as line items when applicable

---

## Technical Details

### Overtime/Overnight Business Rules (from extra-time-calculator.ts)

| Extra Hours | Charge Type | Calculation |
|-------------|-------------|-------------|
| 0 | None | No charge |
| 1-10 hrs | Overtime | hours × hourly rate (default LKR 500/hr) |
| 10+ hrs | Overnight | First 24h block = night fee (LKR 3,000) + remaining calculated recursively |

### Example Calculation
For QUO-2026-0944:
- Trip: 375.6 km → Available: 37.56 hrs
- Duration: Jan 23 00:00 to Jan 25 15:30 = 63.5 hrs
- Extra hours: 63.5 - 37.56 = 25.94 hrs
- Since > 10 hrs: 1 night block (LKR 3,000) + (25.94 - 24) = 1.94 hrs × 500 = 970
- Total: LKR 3,970 (currently showing as 0)
