

# Fix: Fuel Price Not Updating Across All Locations

## Problem
The database confirms that the "ncg bus yard" default row has diesel price **303**, but all other parking locations still show **283**. The previous fix (`.gte('id', ...)`) appears to not have propagated correctly. When a quotation uses a non-default parking location (e.g., Papiliyana at 283), it gets the old price.

## Root Cause
Two issues:
1. **The `.gte('id', 'uuid')` filter may not reliably match all rows** — UUID comparison with `.gte` is lexicographic and may behave unexpectedly. A safer approach is needed.
2. **There are TWO rows marked `is_default: true`** (ncg bus yard and Wathupitiwala), which causes ambiguity in which "default" settings are loaded.

## Fix

### File: `src/components/special-hire/FuelSettingsAdmin.tsx`

Replace the `.gte('id', '00000000-0000-0000-0000-000000000000')` filter with **no filter at all** (update all rows), or use `.not('id', 'is', null)` which is a guaranteed match for all rows:

```typescript
const { error } = await supabase
  .from('fuel_settings')
  .update({
    diesel_price_lkr_per_l: defaultSettings.diesel_price_lkr_per_l,
    maintenance_rate_lkr_per_km: defaultSettings.maintenance_rate_lkr_per_km
  })
  .not('id', 'is', null);  // Matches ALL rows reliably
```

### Database: Fix existing stale data

Run a one-time update via a temporary edge function to set all locations to the correct current price (303), so existing locations are in sync immediately — not just on next save.

| Change | Detail |
|---|---|
| `FuelSettingsAdmin.tsx` | Replace `.gte(...)` with `.not('id', 'is', null)` for reliable global update |
| One-time DB fix | Update all `fuel_settings` rows to current diesel price via edge function |

