

# Add Fuel Consumption & Meter Columns to Fleet Master Spreadsheet

## What the User Wants

The screenshot shows a "Passenger Bus Service Daily Operation Report - Fuel Consumption" with these columns that are **missing** from the current Fleet Master Spreadsheet:

| Column | Source |
|---|---|
| Bus Model | `buses.model` (already in DB) |
| Start Meter | `daily_trips.odometer_start` |
| End Meter | `daily_trips.odometer_end` |
| Total Mileage | `daily_trips.distance_km` (or computed: end - start) |
| Fuel Litter | `daily_trips.fuel_liters` OR `daily_bus_expenses.fuel_liters` |
| Fuel Consumption | `daily_trips.km_per_liter` (or computed: mileage / liters) |
| Standard Rate | `buses.expected_km_per_liter` |
| Performance | Computed: `standard_rate - fuel_consumption` (positive = good) |

All data already exists in the database — no new tables or columns needed.

## Changes

### 1. `src/hooks/useFleetMasterSpreadsheet.ts` — Extend data model + fetching

- Add to `FleetRosterRow`: `bus_model` (from buses join)
- Add to `ExpandedFleetRow`: `start_meter`, `end_meter`, `total_mileage`, `fuel_liters`, `fuel_consumption`, `standard_rate`, `performance`
- Extend the `buses!inner` select to include `model, expected_km_per_liter`
- Map `odometer_start`, `odometer_end`, `distance_km`, `fuel_liters`, `km_per_liter` from matched daily trips
- Also pull `fuel_liters` from `daily_bus_expenses` as fallback
- Compute performance: `standard_rate - fuel_consumption`
- Add `totalMileage` and `totalFuelLiters` to KPIs

### 2. `src/components/fleet/FleetMasterSpreadsheetCore.tsx` — Add new column group

- Add a new **"Fuel & Meter"** column group header (orange/slate colored, matching the screenshot style)
- Add 7 new column headers: Bus Model, Start Meter, End Meter, Total Mileage, Fuel Liters, Consumption, Std Rate, Perform
- `Start Meter` and `End Meter` are **editable** (they update `daily_trips` via a new update path)
- `Total Mileage`, `Consumption`, `Performance` are **computed/read-only**
- Performance cell is **color-coded**: green for positive (good), red for negative (bad), yellow for borderline — matching the screenshot's style
- Update `colSpan` on section headers and empty state row

### 3. `src/hooks/useFleetMasterSpreadsheet.ts` — Trip field updates

- Extend `updateField` to handle trip-level fields (`odometer_start`, `odometer_end`, `fuel_liters`) by writing to `daily_trips` instead of `fleet_master_roster`
- When start/end meter updates, auto-recalculate `distance_km` and `km_per_liter`

### 4. `src/components/fleet/FleetMasterSpreadsheet.tsx` — KPI updates

- Add "Total Mileage" and "Total Fuel" KPI cards to the existing grid

### 5. `src/components/fleet/FleetExcelImport.tsx` — Map new columns from Excel

- Add header synonyms: `startMeter: ['start meter', 'meter start']`, `endMeter: ['end meter', 'meter end']`, `fuelLiters: ['fuel litter', 'fuel liters', 'fuel']`, `standardRate: ['standard rate', 'std rate']`
- These values write to `daily_trips` after "Create Trips" (not to roster)

## Column Layout (updated spreadsheet)

```text
Bus Info | Route & Type | Config | Status | Crew | Turns | Meter/Fuel (NEW)        | Financials
No, Bus  | Route,Trip,  | Trips/ | Remark | Dr,  | T01,  | Model, Start, End, KM,  | Target, Pass,
         | Type, Permit | Day    |        | Cond | T02   | Fuel, Cons, Std, Perf   | Lugg, Exp, Net
```

Total columns: 17 existing + 8 new = 25 columns

## Performance Cell Color Logic (matching screenshot)

- Green background: performance >= 0 (consuming less than standard)
- Yellow background: performance between -0.5 and 0
- Red/pink background: performance < -0.5 (consuming more than standard)

