
Goal: Fix the Special Hire edit flow so updated/manual-trip recalculations are actually saved, and quotation preview/version totals no longer revert to old amounts.

What I found
- The saved record is inconsistent: `km_trip` is updated (274) but financial fields are stale (`gross_revenue`, `exceeding_distance_charge`, `overtime_charge`, `customer_total_with_fuel` still old).
- Root cause is in `SpecialHireForm.tsx` submit logic:
  1) `hasRouteChanged()` does not include manual trip override state/value, so submit often goes into “preserve old calculations”.
  2) Payload mixes old `costs` with fallback values from `costData` (e.g. fuel), creating partial updates.

Implementation plan
1. Update change-detection to include manual trip override
- File: `src/components/special-hire/SpecialHireForm.tsx`
- Extend `hasRouteChanged()` to return `true` when:
  - `useManualTripDistance` differs from `originalData.uses_manual_trip_distance`
  - manual trip is enabled and `manualTripDistance` differs from original manual value (fallback to original `km_trip`).

2. Respect user recalculation before update
- In `handleSubmit`, add a “recalculated in UI” guard by comparing current `costData` vs `initialData` key totals (e.g. `grossRevenue`, `hireCharge`, `exceedingDistanceCharge`, `customerTotalWithFuel`).
- If recalculated values differ, force recalculation path instead of preserve path.

3. Remove stale mixed-field fallbacks in save payload
- Keep payload financially atomic from `costs` object when submitting:
  - Use `costs.fuel_cost_fuel_only` directly (remove `costData` override fallback).
  - Use `costs.customerTotalWithFuel` directly (remove stale fallback).
- Keep distance consistency:
  - `km_trip` and `manual_km_trip` should only use manual value when manual override is enabled and value is valid (`> 0`); otherwise use calculated `costs.km_trip`.

4. Verify existing broken-version repair path
- After this fix, opening an affected quotation, recalculating, and updating should create a version with aligned fields:
  - `km_trip`, `exceeding_distance_charge`, `overtime_charge`, `gross_revenue`, `customer_total_with_fuel` all from the same recalculation.

Technical details
- Primary file: `src/components/special-hire/SpecialHireForm.tsx`
- No template math change is needed in `QuotationPreview.tsx`; preview currently reflects DB values correctly, so fixing persistence fixes preview/version output.
- Expected outcome for this case: Outside hire with 274 km should persist exceeding charge from 174 km × LKR 175 and corresponding updated total, not the prior 222/211.8 km-derived values.

Validation checklist
- Edit affected quotation version, keep same manual distance (274), click recalculate, then Update.
- Confirm DB row fields change together (not just `km_trip`): `exceeding_distance_charge`, `overtime_charge`, `gross_revenue`, `customer_total_with_fuel`.
- Open quotation preview PDF and cost breakdown; totals must match exactly.
