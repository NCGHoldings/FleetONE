

# Fix "Today Only" Mode — Trips/Day Should Work Like Master Sheet

## Problem

In "Today Only" mode, when you change Trips/Day (e.g., from 2 to 1), it **immediately creates or deletes trip records** in the `daily_trips` table. This is wrong — you want the same behavior as Master mode:

1. Change Trips/Day values for multiple buses first
2. Then click **"Create Remaining"** to generate all trips at once

Currently the daily mode `trips_per_day` edit triggers a confirmation dialog and instantly adds/removes `daily_trips` rows. The user wants to just update the roster's `trips_per_day` value and use "Create Remaining" to batch-create trips.

## Fix

### `src/hooks/useFleetMasterSpreadsheet.ts`
- **Remove the entire daily-mode special handling** for `trips_per_day` (lines 309-399). In both master and daily mode, `trips_per_day` should just update the `fleet_master_roster` table — same as master mode already does (lines 402-413).
- The "Create Remaining" function already compares `existingTripCounts` vs `row.trips_per_day` and creates missing trips. So after updating `trips_per_day` on the roster, "Create Remaining" will handle the actual trip generation.

### `src/components/fleet/FleetMasterSpreadsheetCore.tsx`
- **Remove the confirmation dialog** for daily-mode trips changes (lines 148-161 in `commitEdit` and lines 733-769 dialog). Since changing Trips/Day now just updates the roster number, no confirmation is needed — trips are only created when "Create Remaining" is clicked.
- Remove the `pendingTripsUpdate` state and `PendingTripsUpdate` interface entirely.
- The `commitEdit` function simply calls `onUpdate(rosterId, 'trips_per_day', val)` directly — same path as all other fields.

## Result

- Changing Trips/Day in "Today Only" mode updates the roster value only (no trips created/deleted)
- Click "Create Remaining" to batch-generate all trips based on the updated Trips/Day values
- Same workflow as Master mode — consistent and predictable
- Reducing trips does NOT auto-delete existing trip records (safe)

