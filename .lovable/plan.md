

# Fix: Make Driver, Conductor & Times Editable on Sub-Rows (Trip Sequence > 1)

## Problem
When a bus has multiple trips per day, only the first trip row (trip_sequence=1) shows editable fields for Driver, Conductor, Turn 01, and Turn 02. All sub-rows (trip_sequence > 1) display "↑" arrows, meaning users cannot assign different crew or times to individual trips -- but in practice, different trips can have different drivers/conductors.

The data model already supports this: each `daily_trips` record stores its own `notes` JSON with `driver`, `conductor`, `turn_01_time`, `turn_02_time`. The rendering just blocks editing on sub-rows.

## Solution

### 1. Modify `src/components/fleet/FleetMasterSpreadsheetCore.tsx`

**A. Update `renderEditableCell` (line 142)**
- Expand the sub-row editable whitelist to include `default_driver`, `default_conductor`, `turn_01_time`, `turn_02_time` alongside the existing `trip_no`, `odometer_start`, `odometer_end`, `fuel_liters`
- Sub-rows will now show their own driver/conductor/time values and be clickable

**B. Update `renderDropdownCell` (line 183)**
- Remove the blanket `trip_sequence > 1 → "↑"` return
- Instead, allow dropdowns like `remark` to still show "↑" on sub-rows, but let crew/time fields through (these use `renderEditableCell`, not dropdowns, so this may just need the remark check)

**C. Update table row rendering (lines 393-396)**
- For sub-rows, display the trip-specific driver/conductor/time from `row.driver_name`, `row.conductor_name`, `row.daily_turn_01_time`, `row.daily_turn_02_time` instead of hiding them with "↑"

### 2. Modify `src/hooks/useFleetMasterSpreadsheet.ts`

**Update `updateField` daily mode handler**
- The existing logic at line 417 already handles updating `default_driver`/`default_conductor`/`turn_01_time`/`turn_02_time` via the `notes` JSON on a specific `daily_trips` record using `row.trip_id`
- Ensure this works correctly for sub-rows by verifying the correct `trip_id` is used (each expanded row already carries its own `trip_id`)
- No major logic changes needed here -- the handler already supports per-trip updates

## Files
- **Modify**: `src/components/fleet/FleetMasterSpreadsheetCore.tsx` -- allow sub-row editing for crew and time fields
- **Modify**: `src/hooks/useFleetMasterSpreadsheet.ts` -- verify sub-row trip_id routing (minor if any)

## Result
- Each trip row shows its own Driver, Conductor, Turn 01, Turn 02 values
- Users can edit these per-trip in daily mode
- Different drivers/conductors can be assigned to different trips of the same bus on the same day
- Master mode behavior unchanged

