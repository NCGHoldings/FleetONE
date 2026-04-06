

# Fix: Allow Trips/Day Editing in "Today Only" Mode

## Problem
In "Today Only" (daily edit mode), clicking `trips_per_day` to edit it fails because:
1. The code enters the daily mode branch and checks for `row.trip_id`
2. If no trip exists yet, it shows "No trip generated" error and returns
3. Even if a trip exists, `trips_per_day` is not mapped to any `daily_trips` field, so `dailyUpdatePayload` stays empty — the code falls through to the master roster update, which works, but only by accident
4. For sub-rows or buses without trips created yet, editing is completely blocked

`trips_per_day` is a **master roster field** — it should always update `fleet_master_roster` regardless of edit mode.

## Fix

### Modify `src/hooks/useFleetMasterSpreadsheet.ts`
In the `updateField` function, add an early check: if the field is a "master-only" field (`trips_per_day`, `bus_type`, `permit_type`, `sort_order`), skip the daily mode branch entirely and go straight to the master roster update.

Add before the `if (editMode === 'daily')` block (around line 268):

```typescript
// Master-only fields should always update fleet_master_roster, even in daily mode
const masterOnlyFields = ['trips_per_day', 'bus_type', 'permit_type', 'sort_order', 'day_target'];
if (masterOnlyFields.includes(field)) {
  const numericFields = ['trips_per_day', 'day_target', 'sort_order'];
  const finalValue = numericFields.includes(field) ? Number(value) || 0 : value;
  // update fleet_master_roster and refetch
  ...
  return;
}
```

This ensures `trips_per_day` can be changed in both Master and Today Only views, and the row expansion (number of trip rows) updates immediately after the change.

### File
- **Modify**: `src/hooks/useFleetMasterSpreadsheet.ts` — add master-only field bypass before daily mode branch

