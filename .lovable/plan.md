

# Fix: Trips/Day Editing in "Today Only" Mode (Daily Override)

## Problem
Two issues with Trips/Day in daily mode:

1. **Cannot edit**: `trips_per_day` is not in the `dailyEditable` list in the Core component, so it shows as greyed out with "Master Edit Only" tooltip
2. **Wrong behavior**: Even after the previous fix (master-only bypass), changing Trips/Day in daily mode permanently changes the master roster. The user wants daily-only adjustments (e.g., a bus normally runs 1 trip but today needs 2)
3. **Hidden trips**: If extra `daily_trips` records exist beyond `trips_per_day`, they are invisible because row expansion only loops up to `master.trips_per_day`

## Solution

### Concept: Daily trip count = actual trips, not master default
In daily mode, the number of visible trip rows per bus should reflect the **actual daily_trips count** for that date (or the master default, whichever is higher). Changing Trips/Day in daily mode will **add or remove daily_trips records** for that bus on the selected date, without touching the master roster.

### 1. Modify `src/components/fleet/FleetMasterSpreadsheetCore.tsx`
- Add `trips_per_day` to the `dailyEditable` array so it becomes clickable in Today Only mode

### 2. Modify `src/hooks/useFleetMasterSpreadsheet.ts`

**A. Fix row expansion (in `fetchRoster`)**:
- After fetching daily trips, compute `effectiveTripsPerDay = max(master.trips_per_day, actual_daily_trips_count)` per bus
- Use `effectiveTripsPerDay` for the expansion loop instead of `row.trips_per_day`
- This ensures extra trips created for a specific day are always visible

**B. Fix `updateField` for `trips_per_day` in daily mode**:
- Remove `trips_per_day` from the `masterOnlyFields` array
- Add a new daily-mode handler before the master-only check:
  - When `editMode === 'daily'` and `field === 'trips_per_day'`:
    - Get current actual trip count for this bus on this date
    - If new value > current count: insert additional `daily_trips` records (with auto-generated trip numbers, copying route/driver/conductor from master)
    - If new value < current count: delete the excess trips (last ones first, only if they have no income data)
    - Refresh the roster silently
    - **Do NOT update `fleet_master_roster`**
  - When `editMode === 'master'`: keep current behavior (update master roster)

### 3. Safety guard for trip deletion
When reducing trips in daily mode, only delete trips that have:
- No income (`income` is null or 0)
- No odometer data
This prevents accidental data loss. If a trip has data, show a toast warning instead.

## Files
- **Modify**: `src/components/fleet/FleetMasterSpreadsheetCore.tsx` — add `trips_per_day` to daily editable list
- **Modify**: `src/hooks/useFleetMasterSpreadsheet.ts` — daily trip count expansion fix + daily-mode add/remove trips logic

## Result
- Trips/Day is editable in "Today Only" mode
- Changes only affect the selected date (add/remove `daily_trips` records)
- Master roster stays unchanged
- Extra trips beyond master default are always visible
- Safe deletion prevents wiping trips that have income data

