

# Fix: Make Standard Rate (Std Rate) Editable in Fleet Spreadsheet

## Problem
The "Std Rate" column in the Fleet Master Spreadsheet is currently read-only — it displays `buses.expected_km_per_liter` (defaults to 8.00 for all buses) but cannot be changed inline. Users need to edit each bus individually via the Edit Bus modal to change this value.

## Plan

### 1. Make the Std Rate cell an editable input (FleetMasterSpreadsheetCore.tsx)
Replace the static text display at line 414-416 with an editable `<Input>` field (same pattern used for Start KM, End KM, Fuel fields). On blur or Enter, it saves the new value.

### 2. Add `updateStandardRate` handler (useFleetMasterSpreadsheet.ts)
Add a new function that updates `buses.expected_km_per_liter` directly for the given bus ID. After saving, recalculate the performance value (standard_rate - fuel_consumption) and do a silent refresh to update the row.

### 3. Recalculate performance on change
When the standard rate changes, the "Perform" column value must also update since `performance = standardRate - fuelConsumption`.

## Files
- **Modify**: `src/components/fleet/FleetMasterSpreadsheetCore.tsx` — replace static cell with editable input for Std Rate
- **Modify**: `src/hooks/useFleetMasterSpreadsheet.ts` — add `updateStandardRate(busId, value)` that writes to `buses.expected_km_per_liter` and refreshes

## Result
Users can click on any Std Rate cell, type a new value (e.g., 6.5, 9.0), and it saves immediately to the bus record. Performance column auto-recalculates.

