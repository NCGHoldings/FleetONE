

# Add Odometer & Fuel Price Details to Daily Trips Summary

## Current State
- The `daily_trips` table already has `odometer_start`, `odometer_end`, `distance_km`, `fuel_liters`, `diesel_price_per_liter`
- The query in `useDailyBusGroupedTrips.ts` already fetches `odometer_start` and `odometer_end` (mapped to `start_odo`/`end_odo`)
- The expanded trip detail (line 370-374) shows odometer only as a tiny subtitle under Distance
- Fuel price per liter and fuel liters are not shown at trip level
- The bus summary row shows distance and km/L but not odometer or fuel price

## Changes

### 1. Add `fuel_liters` and `diesel_price_per_liter` to Trip interface and data mapping
**File: `src/hooks/useDailyBusGroupedTrips.ts`**
- Add `fuel_liters` and `diesel_price_per_liter` to the `Trip` interface
- In the trip mapping (line 226-244), also read `trip.fuel_liters` and `trip.diesel_price_per_liter`

### 2. Enhance the bus summary row with odometer range and fuel price
**File: `src/components/trips/BusDailySummaryTable.tsx`**

In the **summary row** (line 218-225, the Distance column):
- Show total start→end odometer range (min start_odo → max end_odo across trips)
- Show diesel price per liter from daily expenses

In the **expanded trip detail** (line 325, the 4-column grid):
- Expand to 5 columns: Time | Odometer & Distance | Fuel | Revenue | Allocated Expense
- **Odometer & Distance**: Show start → end odometer readings prominently, with auto-calculated distance below
- **Fuel**: Show fuel liters, diesel price/L, and fuel cost — making it clear how fuel expense is derived

### 3. Add fuel liters to bus summary interface
**File: `src/hooks/useDailyBusGroupedTrips.ts`**
- Add `total_fuel_liters` and `diesel_price_per_liter` to `BusDailySummary` interface
- Compute `total_fuel_liters` from trip-level `fuel_liters` sum
- Pass through `diesel_price_per_liter` from expense data

## No database changes needed
All columns already exist in the schema.

## Files to Change
- `src/hooks/useDailyBusGroupedTrips.ts` — add fuel fields to Trip and BusDailySummary interfaces and data mapping
- `src/components/trips/BusDailySummaryTable.tsx` — enhance summary row and expanded trip details with odometer/fuel display

## Result
- Each trip shows Start KM → End KM → Distance (auto-calculated)
- Fuel liters, diesel price/L, and fuel cost visible per trip
- Bus summary row shows odometer range and fuel price
- Distance is clearly linked to odometer readings

