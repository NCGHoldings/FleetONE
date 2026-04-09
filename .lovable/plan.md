

# Special Hire Spreadsheet — Enhanced Sections, Fuel Logic, Efficiency Colors & Daily Trips Interconnection

## Problems Identified

1. **Bus model/details not pulled from fleet**: The spreadsheet shows `bus_type_name` from the quotation's `bus_types` table, but doesn't fetch the actual fleet bus details (model, year, capacity) from the `buses` table based on `assigned_bus_no`
2. **Section collapse not focused enough**: Collapsible groups exist but when expanding a section like "Meter / KM", ALL other sections also show — no "focus mode" where you see only Bus Info + the selected section
3. **No fuel efficiency color coding**: When actual km/L is below the bus type's standard rate (`avg_km_per_l`), it should show red; green when at or above standard
4. **No fuel cost → liters auto-calculation**: The spreadsheet has `fuel_cost_actual` but no fuel price field to derive liters automatically
5. **No bidirectional sync with Daily Trips**: Special Hire data doesn't flow to/from the Daily Trips page
6. **Fleet management cross-links missing**: No link to bus master data sheet or fleet analytics from this spreadsheet

## Plan

### 1. Fetch Bus Details from Fleet (`useSpecialHireSpreadsheetData.ts`)

- After fetching quotations, collect all unique `assigned_bus_no` values
- Query `buses` table to get `id, bus_no, model, year, capacity, type`
- Query `bus_types` to get `avg_km_per_l` (standard fuel efficiency rate)
- Map bus details onto each hire row: add fields `bus_model`, `bus_year`, `bus_capacity`, `standard_km_per_l`

### 2. Add Fuel Price & Auto-Calculate Liters (`useSpecialHireSpreadsheetData.ts`)

- Read `fuel_price_per_liter` from `special_hire_quotations` (column already exists)
- Add new fields to `SpreadsheetHire`: `fuel_price_per_liter`, `fuel_liters_calculated`, `actual_km_per_l`
- Auto-compute: `fuel_liters = fuel_cost_actual / fuel_price_per_liter`
- Auto-compute: `actual_km_per_l = actual_km / fuel_liters`
- In `updateField`: when `fuel_price_per_liter` changes, save to quotation table directly

### 3. Section Focus Mode (`SpecialHireSpreadsheetCore.tsx`)

- Add a "Focus" toggle alongside existing collapse buttons
- When Focus mode is active and a section is clicked: show only "Hire Info" (first 3-4 identity columns: #, Quotation No, Bus No) + the selected section
- This gives maximum space for data entry in the focused section
- Regular toggle mode still works as before (show/hide individual sections)

### 4. Fuel Efficiency Color Coding (`SpecialHireSpreadsheetCore.tsx`)

- Add new columns in the Expenses section: "Price/L", "Liters", "KM/L"
- Color the KM/L cell:
  - **Green** when `actual_km_per_l >= standard_km_per_l` (good performance)
  - **Red** when `actual_km_per_l < standard_km_per_l` (negative performance)
  - Show the gap: e.g., "3.0 (Std: 4.0)" in red

### 5. Bidirectional Daily Trips Sync

**Special Hire → Daily Trips direction:**
- When a special hire trip is marked "completed" with bus/date/revenue data, auto-create or link a `daily_trips` record tagged with `source = 'special_hire'` and `source_id = quotation_id`
- Pass: bus_id, date, income (gross_revenue), distance (actual_km), fuel_cost, start/end odometer

**Daily Trips → Special Hire direction:**
- In `fetchData`, also query `daily_trips` where `source = 'special_hire'` to pull back any revenue/expense updates made from the Daily Trips page
- Show synced data with a badge indicator

### 6. Fleet Cross-Links

- Make the "Bus No" cell clickable → opens Bus Master Data Sheet dialog
- Show bus model/year/capacity as read-only info columns in the Operations section
- Link fuel efficiency data to the fleet performance analytics

## Files to Change

- **`src/hooks/useSpecialHireSpreadsheetData.ts`** — fetch bus details from `buses` table, add fuel price/liters/efficiency fields, add daily_trips sync logic
- **`src/components/special-hire/spreadsheet/SpecialHireSpreadsheetCore.tsx`** — add focus mode, fuel efficiency columns with color coding, bus detail columns, clickable bus no linking to fleet
- **`src/hooks/useSpecialHireSpreadsheetData.ts`** (updateField) — handle fuel_price_per_liter saves, auto-create daily_trips on completion

## Result

- Bus model, year, capacity auto-populated from fleet management when bus is assigned
- Focus mode lets you work on one section at a time with full space
- Fuel cost + price/L → auto-calculated liters and km/L with red/green performance indicators
- Bidirectional data flow between Special Hire sheet and Daily Trips page
- Clicking bus number opens the fleet master data sheet for full vehicle details

