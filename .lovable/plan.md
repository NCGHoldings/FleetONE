

# NCG Express Fleet Master Spreadsheet — Daily Operations Tracker

## What You Want

A **master spreadsheet** (like the Excel screenshots) that shows all 48 active buses with their routes, drivers, conductors, bus type, permit type, and daily financial data. Key features:

1. **No of Trips column** — Jaffna route = 1 trip, Badulla = 2 trips, Moratuwa-Nittabuwa = 4. When set to 2, that bus row **expands into 2 sub-rows** (Trip 1, Trip 2), each linked to a `daily_trips` record
2. **Two-way sync with Daily Trips** — editing driver/conductor here updates `daily_trips.notes`, and OCR-uploaded revenue/expenses flow back into this spreadsheet
3. **Auto-create daily trips** — when you confirm tomorrow's roster in the master sheet, it auto-inserts `daily_trips` rows (bypassing driver allocation if you want)
4. **Columns match your Excel**: No, Bus, Route, Trip, Bus Type, Permit Type, Route Start Date, Remark, Driver, Conductor, Turn 01/02 Times, Day Target, Passenger Income, Luggage, Total Expenses, Net

## New Database Table

A `fleet_master_roster` table stores the **template** data (which bus runs which route, how many trips, default driver/conductor). This is the "master" that persists day-to-day.

```
fleet_master_roster
├── id (uuid PK)
├── bus_id (uuid FK → buses)
├── route_id (uuid FK → routes)
├── route_label (text) — e.g. "Makumbura - Badulla"
├── bus_type (text) — XL, Normal, Semi, A/C
├── permit_type (text) — XL, A/C, Normal, Semi
├── route_start_date (date)
├── trips_per_day (int, default 1)
├── default_driver (text)
├── default_conductor (text)
├── day_target (numeric)
├── remark (text) — Running, Repair, Hire, etc.
├── section (text) — OLD RUNNING ROUTES, NEWLY STARTED, EXTRA ROUTES
├── sort_order (int)
├── is_active (boolean)
├── created_at, updated_at
```

## Implementation Plan

### 1. Create `fleet_master_roster` table
- SQL migration to create the table
- Populate from existing 48 active buses
- User can edit all fields inline

### 2. New Hook: `src/hooks/useFleetMasterSpreadsheet.ts`
- Fetches `fleet_master_roster` joined with `buses`, `routes`
- For a selected date, fetches matching `daily_trips` and `daily_bus_expenses` to overlay revenue/expense data
- **Trip expansion**: if `trips_per_day = 2`, generates 2 display rows, each linked to the matching `daily_trips` record (matched by `bus_id + trip_date + trip sequence`)
- `updateField()` — updates roster fields OR daily_trips fields depending on column
- `confirmAndCreateTrips(date)` — takes current roster, creates `daily_trips` entries for that date (with driver/conductor in notes), skipping already-existing trips

### 3. New Component: `src/components/fleet/FleetMasterSpreadsheet.tsx`
- Color-coded column groups matching your Excel:
  - **Bus Info** (blue header): No, Bus, Route, Trip, Bus Type, Permit Type, Route Start Date, Remark
  - **Crew** (green): Driver, Conductor
  - **Turns** (light blue): Turn 01 Start Time, Turn 02 Start Time
  - **Income** (yellow): Day Target, Passenger, Luggage, Total Expenses, Net
- **Section headers** ("OLD RUNNING ROUTES", "NEWLY STARTED ROUTES", "EXTRA ROUTES") as full-width blue bars
- Trip expansion: when `trips_per_day > 1`, show sub-rows with trip sequence numbers
- All cells editable inline (dropdowns for Bus Type, Permit Type, Remark status)
- **Toolbar**: Date picker, "Create Trips for Date" button, Refresh, Export Excel, Search
- KPI cards: Total Buses Running, Total Revenue, Total Expenses, Net Income

### 4. Integration with Daily Trips Page
- Add a "Fleet Sheet" tab to `DailyTrips.tsx` (alongside Daily Trips, Bus P&L, Route P&L)
- When trips are created from this sheet, they appear in the existing Daily Trips view
- OCR-uploaded data (income_details, expenses) flows back because we read from `daily_trips` for the selected date

### 5. Revenue/Expense Data Flow
- Income columns (Passenger, Luggage) read from `daily_trips.income_details` JSONB
- Total Expenses reads from `daily_bus_expenses` for that bus+date
- Net = Passenger + Luggage - Total Expenses (auto-computed)
- When OCR uploads update a trip's income, refreshing the master sheet shows it immediately

## Files to Create/Edit

| File | Action |
|---|---|
| SQL migration | Create `fleet_master_roster` table |
| `src/hooks/useFleetMasterSpreadsheet.ts` | Data hook with trip expansion + two-way sync |
| `src/components/fleet/FleetMasterSpreadsheetCore.tsx` | Main grid component |
| `src/components/fleet/FleetMasterSpreadsheet.tsx` | Wrapper with toolbar |
| `src/pages/DailyTrips.tsx` | Add "Fleet Sheet" tab |

## How It Works Day-to-Day

1. Open **Fleet Sheet** tab → see all 48 buses with their default drivers/conductors
2. Pick tomorrow's date → review/edit any driver/conductor changes
3. Click **"Create Trips"** → auto-generates `daily_trips` rows for all active buses
4. Throughout the day, OCR uploads and manual entries fill in Passenger/Luggage/Expenses
5. Refresh the sheet → all financial columns update with live data
6. Both this sheet AND the existing Daily Trips card view show the same data

