

# Bulk-Populate Fleet Master Roster

## Problem
The `fleet_master_roster` table is empty (0 rows), while `buses` has 49 records. Users must add buses one-by-one via the dialog, which is impractical for 48 buses.

## Solution
Add a **"Bulk Add All Buses"** button that inserts all active buses into the roster in one operation, plus set sensible defaults.

### Changes

**`src/components/fleet/FleetMasterSpreadsheet.tsx`**
- Add a "Bulk Add All" button next to "Add Bus" (shown only when roster is empty or has fewer buses than available)
- On click: fetch all buses, insert into `fleet_master_roster` with defaults (`trips_per_day: 1`, `remark: 'Running'`, `is_active: true`, route from `buses.route`)

**`src/hooks/useFleetMasterSpreadsheet.ts`**
- Add `bulkAddAllBuses()` function that:
  1. Fetches all buses not already in roster
  2. Inserts them with `sort_order` based on bus_no ordering
  3. Sets `route_label` from `buses.route`
  4. Refetches roster after insert

This gives users a one-click way to populate the entire fleet roster, after which they can edit individual fields (trips_per_day, driver, conductor, etc.) inline.

