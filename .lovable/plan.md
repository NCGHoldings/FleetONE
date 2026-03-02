

# Fix Special Hire Fuel Price and Hardcoded Fallback Issues

## Problems Found

1. **Fuel price not stored with quotation**: The `special_hire_quotations` table does not store `fuel_price_per_liter`. When viewing old quotations in EnhancedCostCalculator, it re-fetches the *current* fuel price from `fuel_settings`. If fuel price changes (e.g., from 283 to 277), all old quotation cost breakdowns show wrong fuel costs.

2. **Hardcoded fallback values throughout the code**: Multiple files use wrong hardcoded fallbacks that don't match actual database values:
   - `|| 350` for fuel price (actual: 277-283 LKR)
   - `|| 30000` for flat fee rate (may not match actual rate cards)
   - `|| 175` for exceeding km rate
   - `|| 100` for exceeding km threshold
   - These kick in when the fuel settings or rate card query returns null, causing wrong amounts silently.

3. **EnhancedCostCalculator fetches wrong fuel settings**: It queries `fuel_settings` by `is_default = true` instead of by the quotation's `parking_location_id`, so it can get a different parking location's fuel price.

4. **CostBreakdown fallback**: `fuelPricePerLiter: data.fuelPricePerLiter || data.fuelPrice || 350` silently uses 350 if the value isn't passed.

## Solution

### 1. Database Migration: Add `fuel_price_per_liter` column to quotations table

Add a new column `fuel_price_per_liter` to `special_hire_quotations` to store the fuel price at the time of quotation creation. This ensures historical accuracy.

### 2. Store fuel price when creating/saving quotations
**File: `src/components/special-hire/SpecialHireForm.tsx`**

In the `quotationData` object (around line 1717), add:
```
fuel_price_per_liter: fuelSettings.diesel_price_lkr_per_l
```
This requires passing `fuelSettings` from `calculateCosts` back, or storing it in component state. The fuel settings are already fetched by parking location ID in `calculateCosts` -- we'll store the price in a ref/state so the submit handler can access it.

### 3. Use stored fuel price in EnhancedCostCalculator
**File: `src/components/special-hire/EnhancedCostCalculator.tsx`**

Change line 291 from:
```typescript
const fuelPricePerLiter = fuelSettings?.diesel_price_lkr_per_l || 350;
```
To:
```typescript
const fuelPricePerLiter = quotation.fuel_price_per_liter || fuelSettings?.diesel_price_lkr_per_l || 277;
```
Prioritize the stored quotation value, fall back to current settings, use a more realistic default last.

### 4. Fix EnhancedCostCalculator to use quotation's parking location
**File: `src/components/special-hire/EnhancedCostCalculator.tsx`**

Change the fuel settings query (lines 259-264) to fetch by the quotation's `parking_location_id` instead of `is_default`:
```typescript
const { data: fuelSettingsArray } = await supabase
  .from('fuel_settings')
  .select('diesel_price_lkr_per_l, maintenance_rate_lkr_per_km')
  .eq('id', quotation.parking_location_id)  // Use quotation's parking
  .limit(1);
```
With a fallback to `is_default` if parking_location_id is missing.

### 5. Remove/update hardcoded fallbacks in CostBreakdown
**File: `src/components/special-hire/CostBreakdown.tsx`**

Change line 151:
```typescript
fuelPricePerLiter: data.fuelPricePerLiter || data.fuelPrice || 350,
```
To use 0 as fallback (so it's obvious something is wrong rather than silently using a wrong value):
```typescript
fuelPricePerLiter: data.fuelPricePerLiter || data.fuelPrice || 0,
```

### 6. Update fallbacks in EnhancedCostCalculator to use stored quotation values first
**File: `src/components/special-hire/EnhancedCostCalculator.tsx`**

For rate card fallbacks, use the quotation's stored values before hardcoded defaults:
- `fixedRate`: Use `quotation.fixed_rate || rateCard?.flat_fee_lkr || 0` (line 283)
- `exceedingDistanceCharge`: Use `quotation.exceeding_distance_charge` first (already partially done at line 329)
- Remove the recalculation of exceeding distance when quotation already has it stored

## Technical Summary

### Database Change
- Add `fuel_price_per_liter NUMERIC` column to `special_hire_quotations` (nullable, no default)

### Files Modified (3)
- `src/components/special-hire/SpecialHireForm.tsx` -- Store fuel_price_per_liter on save, capture fuelSettings in state
- `src/components/special-hire/EnhancedCostCalculator.tsx` -- Use stored fuel price, fix parking location query, fix hardcoded fallbacks
- `src/components/special-hire/CostBreakdown.tsx` -- Fix fallback from 350 to 0

