

# Fix: Import ALL 217 Buses from Excel + Flag/Remove Fake DB Buses

## Current Problem

- Excel has **217 buses** (100% accurate source of truth)
- Database has **76 buses** (68 matched to Excel, 8 did NOT match — likely fake/test data like NK-1234, NK-2847, NK-3456, NK-5678, NK-9012)
- Import showed "68 updated, 0 created, **150 skipped**" — the 150 new buses were skipped because the "Auto-create" toggle was OFF by default
- Even when toggled ON, user may not notice it — it should default to ON since Excel is the master source

## What I'll Change

### 1. Auto-Create ON by Default
Change `autoCreate` initial state from `false` to `true` so all 150 new buses get created automatically.

### 2. Add "Buses NOT in Excel" Warning Section
After parsing, cross-reference DB buses against Excel. Show a red-highlighted section listing DB buses that have NO match in the Excel sheet (e.g., NK-1234, NK-3456). These are likely fake/test entries.

Add options:
- **Flag as inactive**: Mark unmatched DB buses as `status = 'inactive'`
- **Delete permanently**: Remove them from the database entirely
- User can select which action to take before importing

### 3. Improve Import Button Text
Show clear counts: "Import 68 Updates + Create 150 New Buses" and separately "Flag/Delete 8 Unmatched DB Buses"

### 4. Route Matching for New Buses
When creating new buses, if the Excel has a route name, try to match it to existing routes in the `routes` table and set the `route_id`.

## Technical Details

- New state: `unmatchedDbBuses` — buses in DB but not in Excel
- After parsing Excel, compute: `existingBuses.filter(b => !excelBusNos.has(normalizeBusNo(b.bus_no)))`
- Show these in a separate warning table with checkboxes
- During import, process selected unmatched buses (deactivate or delete)
- `autoCreate` defaults to `true`

## Files
- **Modify**: `src/components/fleet/FleetVehicleDataImport.tsx`
  - Default `autoCreate = true`
  - Add unmatched DB bus detection and display
  - Add deactivate/delete options for unmatched buses
  - Execute cleanup during import step

## Result
- All 217 Excel buses will be imported (68 updated + 149 created)
- 8 fake/test DB buses flagged and removable
- Excel becomes the single source of truth for the fleet

