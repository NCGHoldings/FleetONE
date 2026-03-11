

# Fix: Fuel Price Not Applying to New Quotes

## Problem
When you update the fuel price in Fuel Settings, the change only saves to the **default** parking location row. But when generating a quote, the system fetches fuel settings by the **selected parking location** — which may be a different row that still has the old price.

## Root Cause
In `FuelSettingsAdmin.tsx`, `handleSaveFuelPrice` updates only the default row:
```typescript
.update({ diesel_price_lkr_per_l: ... })
.eq('id', defaultSettings.id)  // Only updates ONE row
```

But `SpecialHireForm.tsx` fetches by parking location:
```typescript
.from('fuel_settings')
.eq('id', data.parkingLocationId)  // Could be a DIFFERENT row
```

## Fix

### File: `src/components/special-hire/FuelSettingsAdmin.tsx`

Update `handleSaveFuelPrice` to apply the diesel price to **all** parking location rows (since diesel price is a global value, not location-specific):

```typescript
// Update ALL rows with the new fuel price
const { error } = await supabase
  .from('fuel_settings')
  .update({
    diesel_price_lkr_per_l: defaultSettings.diesel_price_lkr_per_l,
    maintenance_rate_lkr_per_km: defaultSettings.maintenance_rate_lkr_per_km
  })
  .gte('id', '00000000-0000-0000-0000-000000000000');
  // removes the .eq('id', defaultSettings.id) filter
```

This ensures that regardless of which parking location is selected in a quote, the latest fuel price is always used.

Also reload the full settings list after saving so the UI reflects the change across all location cards.

### One file changed, one line fix.

