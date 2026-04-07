

# Fix: Delete Fake Buses Not in Excel + Fix "Inactive" Status Bug

## Problem

The database has **226 buses** but the Excel master has only **217**. There are **8 buses** that were never imported from Excel (no `import_raw_data`, no `vehicle_name`):

| Bus No | Origin |
|---|---|
| NK-1234 | Fake/test |
| NK-2847 | Fake/test |
| NK-3456 | Fake/test |
| NK-5678 | Fake/test |
| NK-9012 | Fake/test |
| NC 6915 | Unknown |
| NC 8760 | Unknown |
| NE 8243 | Unknown |

The importer already has "Delete Permanently" and "Flag as Inactive" buttons for unmatched buses, but:

1. **"Flag as Inactive" silently fails** — it tries to set `status = 'inactive'` but the `fleet_status` enum only allows `active | maintenance | idle | retired`. The update gets a DB error and does nothing.
2. **Default action is "none"** — even if the user sees the 8 buses flagged, they must manually click "Delete Permanently" before importing. Easy to miss.

## Plan

### 1. Fix the deactivate action
Change `status: "inactive"` → `status: "retired"` since that's the closest valid enum value for buses removed from the fleet.

### 2. Default unmatched action to "delete" 
Change the default `unmatchedAction` from `"none"` to `"delete"` so fake buses are cleaned up by default during import. The user can still deselect individual buses or switch to "Flag as Retired."

### 3. Rename UI labels
- "Flag as Inactive" → "Flag as Retired" (matches the actual enum)
- Keep "Delete Permanently" as-is

## Files
- **Modify**: `src/components/fleet/FleetVehicleDataImport.tsx`
  - Line 180: default `unmatchedAction` to `"delete"`
  - Line 445: change `"inactive"` → `"retired"`
  - Line 568: rename button label to "Flag as Retired"

## Result
Next time the user imports the Excel sheet, the 8 unmatched buses will be auto-selected for deletion. After import, fleet count will be 217 (or 218 if one extra is valid) — matching the Excel master exactly.

