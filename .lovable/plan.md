

# Fix Fleet Performance Metrics & Daily Trips Odometer Display

## Issues Found

### 1. Model shows "Unknown" — Data issue, not code
The query already fetches `buses.model`. But most buses have `model = 'Unknown'` in the database. The model column needs to be updated with actual bus models (e.g., "Tata LP 1512", "Imported Bus").

### 2. Fuel % shows 100% — Wrong column names in expense map
The `expenseMap` total (line 270-275 in `useTripsAnalytics.ts`) uses **wrong column names**:
- `toll_cost` → should be `highway_charges`
- `repair_cost` → should be `repair`
- `driver_salary` → should be `salary`
- `conductor_salary` → doesn't exist separately
- `other_expenses` → should be `other`

Because these columns don't match, the total only counts `fuel_cost`, making fuel% = 100% for every bus.

### 3. Km/L shows 0.00 — No fuel_liters data
The `fuel_liters` column in `daily_bus_expenses` is 0 for all recent records. The system stores `fuel_cost` but not liters. Km/L needs to be calculated differently — using `fuel_cost / diesel_price_per_liter` to derive liters when `fuel_liters` is 0.

### 4. Route(s) shows "-" — Already working but no route data for some buses
The code correctly collects routes from `trip.routes.route_name`. Buses showing "-" genuinely have no route assigned in their trips.

### 5. Daily Trips odometer not showing — No odometer data entered
The UI code is correct (shows start→end when available). But `odometer_start` and `odometer_end` are null/0 for April trips. This is a data entry issue — users need to enter odometer readings via the Fleet Sheet or Quick Entry.

## Technical Fix

### File: `src/hooks/useTripsAnalytics.ts`

**Fix 1 — Correct expenseMap total calculation (line 270-275)**:
Replace wrong column names with the actual `daily_bus_expenses` columns:
```
total = fuel_cost + highway_charges + repair + tyre_tube + salary + 
        food + parking + body_wash + runner + police + log_sheet + 
        permits_renewal + temporary_permit + legal_court + ntc + 
        emission_fitness + accident_compensation + staff_accommodation + 
        vehicle_hire + short_misc + other
```
This matches the overview calculation already done at lines 288-309.

**Fix 2 — Derive fuel_liters from fuel_cost when missing (line 451-461)**:
When `fuel_liters = 0` but `fuel_cost > 0`, estimate liters using `diesel_price_per_liter`:
```
if (totalFuelLiters === 0 && totalFuelCost > 0 && dieselPrice > 0) {
  totalFuelLiters = totalFuelCost / dieselPrice;
}
```
This allows Km/L to be calculated even without explicit liter entries.

**Fix 3 — Also fix the per-bus expenseMap lookup to include fuel_liters from expense data**:
The `expenseMap` already spreads all fields (`...exp`), so `fuel_liters` and `diesel_price_per_liter` are available. Just need to use `diesel_price_per_liter` for the fallback calculation.

### File: `src/components/trips-analytics/BusFleetSection.tsx`
No changes needed — the UI already displays all columns correctly. The fix is in the data layer.

### Database — Update bus models (migration)
Update the `Unknown` models with correct values for the most common buses. Based on the user's earlier roster data, at minimum:
- NG 8241, NG 8242 → "Imported Bus"  
- Other buses can be updated when the user provides model info

## Files to Change
- `src/hooks/useTripsAnalytics.ts` — fix expenseMap total column names, add fuel_liters derivation from cost
- New SQL migration — update bus models where known

## Result
- Fuel % shows correct proportion (e.g., 30-50% instead of 100%)
- Km/L calculates properly using derived liters when explicit data is missing
- Bus models display correctly for known buses
- Daily Trips odometer display already works — will show data once odometer readings are entered

