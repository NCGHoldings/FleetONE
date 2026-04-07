

# Fix: Force-Delete 8 Fake/Unmatched Buses (Total 226 → 218)

## Root Cause

The importer's "Delete Permanently" button calls `supabase.from("buses").delete().eq("id", bus.id)` — but **30 tables** have foreign keys referencing `buses`. Some of these 8 buses have linked `daily_trips` and `daily_bus_expenses` records, so the delete silently fails with a FK constraint violation.

| Bus No | Trips | Expenses | Origin |
|---|---|---|---|
| NK-1234 | 1 | 0 | Fake/test |
| NK-2847 | 1 | 0 | Fake/test |
| NK-3456 | 1 | 0 | Fake/test |
| NK-5678 | 1 | 0 | Fake/test |
| NK-9012 | 1 | 0 | Fake/test |
| NC 6915 | 1 | 0 | Not in Excel |
| NC 8760 | 0 | 0 | Not in Excel |
| NE 8243 | 3 | 2 | Not in Excel |

## Plan

### 1. Database migration to delete the 8 buses and their orphan data
Write a migration that:
- Deletes all `daily_trips` referencing these 8 bus IDs
- Deletes all `daily_bus_expenses` referencing these 8 bus IDs
- Deletes any other FK-linked rows (fleet_master_roster, bus_service_alerts, etc.) for these IDs
- Finally deletes the 8 buses themselves

This is safe because these buses have no real operational data — just 1-2 test records each.

### 2. Fix the importer's delete logic to handle FK constraints
Update `FleetVehicleDataImport.tsx` so that when deleting unmatched buses, it first cleans up FK-linked records (trips, expenses, roster, etc.) before deleting the bus row. Show the actual error to the user if deletion still fails.

## Files
- **New migration**: Delete 8 specific buses and their orphan FK records
- **Modify**: `src/components/fleet/FleetVehicleDataImport.tsx` — cascade-delete FK records before bus deletion, show errors on failure

## Result
Fleet count drops from 226 to 218. Future imports can properly delete unmatched buses without silent FK failures.

