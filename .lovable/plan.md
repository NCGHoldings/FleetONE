

# Enhance Complete Fleet Performance Table with Additional Columns

## What's Missing

The "Complete Fleet Performance" table currently shows: Bus No, Type, Trips, Distance, Revenue, Net Profit, Efficiency, Utilization, Last Trip. But it's missing critical operational and financial columns.

## New Columns to Add

| Column | Source | Description |
|--------|--------|-------------|
| **Model** | `buses.model` | Bus model (already fetched but not displayed) |
| **Route(s)** | `daily_trips.routes` | Distinct routes the bus ran during the period |
| **Expenses** | `expenseMap` | Total expenses for the period |
| **Fuel Cost** | `exp.fuel_cost` | Total fuel cost |
| **Fuel %** | fuel / total expenses | Fuel as percentage of total expenses |
| **Std Fuel Rate** | distance / fuel_liters | Standard rate based on expected consumption |
| **Fuel Gap** | actual vs standard | Difference between actual and expected fuel cost |
| **Income/km** | revenue / distance | Revenue efficiency per kilometer |

## Technical Changes

### 1. `src/hooks/useTripsAnalytics.ts`
- Expand `BusStats` interface with: `routes: string[]`, `totalFuelCost`, `totalFuelLiters`, `fuelPercentage`, `stdFuelRate`, `fuelGap`, `incomePerKm`
- In `busStats` calculation (line 424-457): collect distinct route names from `busTrips`, sum `fuel_cost` and `fuel_liters` from `expenseMap`, compute fuel % and gap

### 2. `src/components/trips-analytics/BusFleetSection.tsx`
- Update `BusStats` interface to match
- Add new table columns: Model, Route(s), Expenses, Fuel, Fuel %, Std Rate, Gap, Income/km
- Add zebra striping to table rows for readability
- Route(s) column shows comma-separated route names with a badge count if multiple
- Fuel % shows color-coded (green if <40%, yellow 40-60%, red >60%)
- Gap shows red if negative (over-consuming), green if positive (under-consuming)

### 3. Table will be horizontally scrollable
Already has `overflow-x-auto` wrapper — the additional columns will scroll naturally on smaller screens.

## Files to Change
- `src/hooks/useTripsAnalytics.ts` — expand BusStats interface and computation
- `src/components/trips-analytics/BusFleetSection.tsx` — add new columns to table

## Result
- Each bus row shows its route(s), model, expense breakdown, fuel analysis, and efficiency gaps
- Color-coded fuel % and gap columns highlight problem buses immediately
- Management can identify fuel-inefficient buses at a glance

