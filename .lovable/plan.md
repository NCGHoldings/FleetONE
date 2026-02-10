

# Fix: Editing Non-Price Fields Should Not Change Total Cost

## Problem

When users edit non-price fields like customer name, email, or company name in a Special Hire quotation, the total cost unexpectedly changes. After saving, the quotation has different values than before, making it unsuitable to send to the customer.

## Root Cause

The `hasRouteChanged` function in `SpecialHireForm.tsx` correctly detects that no route/price fields changed and enters the "preserve original calculations" branch. However, the preserved `costs` object is **missing several fields** that are then written as `0` to the database:

- `fixed_rate` -- lost (written as `0`)
- `overtime_charge` -- lost (written as `0`)
- `overnight_charge` -- lost (written as `0`)
- `exceeding_distance_charge` -- lost (written as `0`)

Additionally, `other_expenses` is parsed from JSON (an array) but then written back directly as an array object instead of a JSON string, which can cause inconsistencies when read back.

The `customer_total_with_fuel` line uses `||` (logical OR) which fails when the value is `0`, falling through to `costData` which may have a stale or different calculated value.

## Solution

### File: `src/components/special-hire/SpecialHireForm.tsx`

**Change 1: Add missing fields to the preserved costs object (around line 1553-1575)**

Add the four missing charge fields to the preserved costs:
- `fixed_rate: initialData.fixed_rate || 0`
- `overtime_charge: initialData.overtime_charge || 0`
- `overnight_charge: initialData.overnight_charge || 0`
- `exceeding_distance_charge: initialData.exceeding_distance_charge || 0`

**Change 2: Fix the `customer_total_with_fuel` assignment (line 1669)**

Replace `||` with `??` (nullish coalescing) so that a legitimate value of `0` is preserved:
```
customer_total_with_fuel: costs.customerTotalWithFuel ?? costData?.customerTotalWithFuel,
```

**Change 3: Fix the `fuel_cost_fuel_only` assignment (line 1645)**

Same `||` to `??` fix to prevent `0` values from being replaced:
```
fuel_cost_fuel_only: (useManualParkingDistance || useManualTripDistance) 
  ? (costData?.fuelCostFuelOnly ?? costs.fuel_cost_fuel_only) 
  : costs.fuel_cost_fuel_only,
```

**Change 4: Ensure `other_expenses` is stored as JSON string consistently (line 1657)**

Wrap the value in `JSON.stringify` when it's an array:
```
other_expenses: typeof costs.other_expenses === 'string' 
  ? costs.other_expenses 
  : JSON.stringify(costs.other_expenses || []),
```

These four changes ensure that editing name, email, company, or any non-price field produces an identical database record for all financial fields.

