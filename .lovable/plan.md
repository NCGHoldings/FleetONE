

# Excel Import for Fleet Master Roster

## What You Need

Upload your Excel file (the one in the screenshot with 37+ rows) to bulk-populate the `fleet_master_roster` table with all bus details including Route, Bus Type, Permit Type, Driver, Conductor, Turn times, Day Target, Remark, and Section. After import, these driver/conductor names persist as defaults and auto-suggest every day.

## How It Works

1. Click **"Import Excel"** button in the Fleet Sheet toolbar
2. Select your Excel file — the system reads columns: No, Bus, Route, Trip, Bus Type, Permit Type, Route Start Date, Remark, Driver, Conductor, Turn 01, Turn 02, Day Target
3. It matches each row's **Bus number** (e.g. "NG 8241") to the existing `buses` table
4. For matched buses, it **upserts** into `fleet_master_roster` — updating driver, conductor, bus type, permit type, turn times, day target, remark, and section
5. Unmatched bus numbers are reported as errors
6. After import, the spreadsheet refreshes with all data populated

## Column Mapping (Excel → Database)

| Excel Column | DB Field |
|---|---|
| Bus | → match `buses.bus_no` to get `bus_id` |
| Route (Trip column) | → `route_label` |
| Bus Type | → `bus_type` |
| Permit Type | → `permit_type` |
| Route Start Date | → `route_start_date` |
| Remark | → `remark` |
| Driver | → `default_driver` |
| Conductor | → `default_conductor` |
| Turn 01 Start Time | → `turn_01_time` |
| Turn 02 Start Time | → `turn_02_time` |
| Day Target | → `day_target` |
| Section headers (e.g. "OLD RUNNING ROUTES") | → `section` |

## Files to Create/Edit

| File | Change |
|---|---|
| `src/components/fleet/FleetExcelImport.tsx` | New component: file upload dialog with validation, preview table, and import button |
| `src/components/fleet/FleetMasterSpreadsheet.tsx` | Add "Import Excel" button to toolbar |
| `src/hooks/useFleetMasterSpreadsheet.ts` | Add `importFromExcel()` function that matches bus numbers and upserts roster entries |

## Import Logic

- Parse Excel with `xlsx` library (already installed)
- Detect section headers (rows where "OLD RUNNING ROUTES", "NEWLY STARTED ROUTES", "EXTRA ROUTES" appear) and assign as `section` to subsequent rows
- For each data row: look up `buses.bus_no` matching the Bus column value
- If bus found and already in roster → **update** all fields (driver, conductor, bus type, etc.)
- If bus found but not in roster → **insert** new roster entry
- If bus not found → add to error list shown to user
- After import, refetch roster to show updated data

## Template Download

Also add a "Download Template" button that exports an empty Excel with the correct column headers so users know the format.

