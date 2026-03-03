

# Fix: Fuel Price Using Wrong Value in Special Hire Calculations

## Problem Identified

The `fuel_settings` table has **17 parking locations** with different diesel prices:
- ncg bus yard: **277** LKR
- Wathupitiwala/Papiliyana/Ridigama etc.: **283** LKR  
- Lyceum Anuradhapura: **279** LKR

When you set 277 manually and select "ncg bus yard", the initial calculation uses 277 correctly. But there are **two recalculation paths** that fetch fuel price incorrectly, causing it to silently switch to 283 or another wrong price:

### Bug 1: Manual Trip Distance Recalculation (Line 2322-2326)
```typescript
const { data: fuelSettings } = await supabase
  .from('fuel_settings')
  .select('*')
  .single();  // <-- NO FILTER! Gets a random row from 17 records
```
This `.single()` call without any `.eq()` filter returns whichever row Supabase picks first. If it picks Wathupitiwala (283) instead of ncg bus yard (277), the recalculated cost uses 283.

### Bug 2: Hardcoded fallback `|| 350` (Lines 2203, 2349)
Two places still use `|| 350` as a fallback for fuel price, which was supposed to be fixed but was missed in these inline recalculation sections.

## Fix

### File: `src/components/special-hire/SpecialHireForm.tsx`

**Fix 1** (Line 2322-2326) -- Add parking location filter to Manual Trip Distance fuel settings query:
```typescript
const { data: fuelSettings } = await supabase
  .from('fuel_settings')
  .select('*')
  .eq('id', formValues.parkingLocationId)
  .single();
```

**Fix 2** (Line 2203) -- Change fallback from 350 to 0:
```typescript
const fuelPrice = fuelSettings?.diesel_price_lkr_per_l || 0;
```

**Fix 3** (Line 2349) -- Change fallback from 350 to 0:
```typescript
const fuelPrice = fuelSettings?.diesel_price_lkr_per_l || 0;
```

### Summary
- 1 critical bug: unfiltered `.single()` query returning a random parking location's fuel price
- 2 minor bugs: leftover `|| 350` hardcoded fallbacks
- All fixes in a single file: `src/components/special-hire/SpecialHireForm.tsx`

