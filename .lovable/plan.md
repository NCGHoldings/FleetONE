

# Fleet Sheet & Bank Reconciliation Fixes

## Issues Identified

### 1. Bank Reconciliation — Deposit before Payment
Currently columns show: `Payment | Deposit`. Standard bank statements show deposits first, then payments.
**Fix**: Swap column order to `Deposit | Payment` in both header and body rows.

### 2. Daily Trips — Per-Trip Route Change
Currently, `renderRouteCell` skips route display for `trip_sequence > 1` (shows "↑"). When a bus has 2+ trips on the same day, each trip should be able to go on a **different route** (e.g., NG 8246 does Colombo-Jaffna and Colombo-Madolsima).
**Fix**: 
- Remove the `trip_sequence > 1` skip in `renderRouteCell`
- In daily mode, update the route on the specific `daily_trips` record (not the roster) per trip sequence
- Store `route_id` and `route_label` per daily_trip row

### 3. Add Bus — Option to Select Route
Currently, "Add Bus" dialog only has a bus dropdown + "Add to Roster" button. No route selection.
**Fix**: Add a route combobox to the Add Bus dialog so the bus is added under the selected route/section.

### 4. Today Only — Trips/Day Not Working
The `isEditable` function includes `trips_per_day` in daily editable fields — but the actual edit flow has a confirmation dialog. The issue is that `renderEditableCell` skips `trips_per_day` for `trip_sequence > 1` rows, which is correct. However, the Trips/Day value may not reflect the actual daily trip count when in "Today Only" mode.
**Fix**: In daily mode, show the **actual trip count** for today (from `daily_trips`) rather than the master roster's `trips_per_day`. Make the value editable and sync correctly.

### 5. Fleet Sheet — Only Show Master Roster Buses (70 buses)
The current roster fetches from `fleet_master_roster` with `is_active = true`. The user wants to ensure this matches exactly their 70-bus operational list.
**Fix**: Cross-check and confirm the roster data matches the provided 70-bus list. The Add Bus flow already filters to `Public Bus` category only. The master roster table is the source of truth — if buses are missing or extra, they can be added/removed through the existing UI. No code change needed here, just data validation.

### 6. Master Data Confirmation
The user provided a 70-bus list. I will confirm whether the current `fleet_master_roster` matches this list. This is a data check, not a code change.

## Files to Change

### `src/components/accounting/BankReconciliationWorksheet.tsx`
- Swap `Payment` and `Deposit` column headers (line ~451-452)
- Swap the corresponding body cells (line ~495-496)

### `src/components/fleet/FleetMasterSpreadsheetCore.tsx`
- `renderRouteCell`: Remove the `trip_sequence > 1` skip — allow per-trip route selection in daily mode
- Route cell for sub-rows: show route selector when in daily mode, show "↑" only in master mode

### `src/hooks/useFleetMasterSpreadsheet.ts`
- `updateField` for `route_label`/`route_id` in daily mode: update the specific `daily_trips` row (using `trip_id`), not just the roster
- Expanded row mapping: read `route_label` from each `daily_trip` row when available, falling back to roster default
- Fix daily-mode `trips_per_day` display to show actual daily trip count

### `src/components/fleet/FleetMasterSpreadsheet.tsx`
- Add Bus dialog: add a route dropdown/combobox so the user can assign a route when adding a bus
- Pass selected route to `addRosterEntry`

### `src/hooks/useFleetMasterSpreadsheet.ts` (addRosterEntry)
- Accept optional `routeId` and `routeLabel` parameters
- Set the route on the new roster entry

## Result

- Bank reconciliation shows **Deposit | Payment** column order (standard format)
- Each trip on the same day/bus can have a **different route**
- Adding a bus shows a **route selection** option
- Today Only mode correctly shows and edits the **actual daily trip count**
- Fleet roster matches the 70-bus operational master list

