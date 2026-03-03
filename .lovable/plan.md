
# Fix: Special Hire Quotation Charges Showing Inconsistent/Wrong Figures

## Problems Found

### Problem 1: `fuel_price_per_liter` NEVER actually saved (Critical)
Line 1771 in SpecialHireForm.tsx uses `costData?.fuelPricePerLiter` but `costData` is React state updated via `setCostData()` inside `calculateCosts`. React state updates are **asynchronous** -- by the time `handleSubmit` reads `costData` on line 1771, it still has the **old** value (or null on first calculation). This is why **all 2,146 quotations** have `fuel_price_per_liter = NULL`.

**Fix**: Add `fuel_price_per_liter` to the `costs` return object inside `calculateCosts()`, and read it from `costs.fuel_price_per_liter` in `handleSubmit` instead of stale React state.

### Problem 2: `||` vs `??` in EnhancedCostCalculator causes zero values to be replaced
When a quotation legitimately has `fixed_rate = 0`, `exceeding_distance_charge = 0`, or `overtime_charge = 0`, the `||` operator treats `0` as falsy and falls through to a recalculated or hardcoded value. This causes intermittent wrong figures.

Affected lines:
- Line 296: `quotation.fixed_rate || rateCard?.flat_fee_lkr || 0` -- if stored fixed_rate is 0, uses rate card value instead
- Line 339: `quotation.fixed_rate || fixedRate` -- same issue
- Line 342: `quotation.exceeding_distance_charge || exceedingDistanceCharge` -- if stored is 0, uses recalculated value

**Fix**: Change all `||` to `??` (nullish coalescing) for stored quotation values so that `0` is respected.

### Problem 3: Hardcoded `|| 175` fallback for exceeding km rate
Line 302: `rateCard?.exceeding_km_rate_lkr || 175` silently uses 175 if rate card lookup fails.

**Fix**: Change to `?? 0`.

### Problem 4: EnhancedCostCalculator recalculates `customerTotalWithFuel` instead of using stored value
Line 462 manually adds up `gross_revenue + fuel + additional - discount`, but this can differ from the actual stored `customer_total_with_fuel` (due to rounding, commission, etc.). This causes the displayed total to differ from what was quoted.

**Fix**: Use the stored `quotation.customer_total_with_fuel` value first, fall back to calculation only if null. Changed from recalculated to: `quotation.customer_total_with_fuel ?? (calculated fallback)`.

### Problem 5: `costs` object missing `fuel_price_per_liter` field
The `costs` object returned from `calculateCosts()` (line 1404-1441) doesn't include `fuel_price_per_liter`, so it can't be reliably used in submission.

**Fix**: Add `fuel_price_per_liter: fuelSettings.diesel_price_lkr_per_l` to the `costs` object.

## Technical Changes

### File 1: `src/components/special-hire/SpecialHireForm.tsx`
- Add `fuel_price_per_liter: fuelSettings.diesel_price_lkr_per_l` to the `costs` object (around line 1440)
- Change line 1771 from `costData?.fuelPricePerLiter || null` to `costs.fuel_price_per_liter || costData?.fuelPricePerLiter || null`
- Also update the preserved-calculations path (line 1638 block) to include fuel_price_per_liter from initialData

### File 2: `src/components/special-hire/EnhancedCostCalculator.tsx`
- Line 296: Change `quotation.fixed_rate || rateCard?.flat_fee_lkr || 0` to `quotation.fixed_rate ?? rateCard?.flat_fee_lkr ?? 0`
- Line 302: Change `rateCard?.exceeding_km_rate_lkr || 175` to `rateCard?.exceeding_km_rate_lkr ?? 0`
- Line 339: Change `quotation.fixed_rate || fixedRate` to `quotation.fixed_rate ?? fixedRate`
- Line 342: Change `quotation.exceeding_distance_charge || exceedingDistanceCharge` to `quotation.exceeding_distance_charge ?? exceedingDistanceCharge`
- Line 462: Use stored `customer_total_with_fuel` first, with recalculation as fallback

### File 3: Database Migration
- Backfill `fuel_price_per_liter` for existing quotations by joining with `fuel_settings` on `parking_location_id`

## Summary
- 3 files modified
- 1 database migration for backfill
- Root cause: React state timing issue (fuel price never saved) + `||` treating legitimate `0` values as falsy (charges flip-flopping)
