

# Fix: "Create Remaining" Count and Trip Creation Logic

## Current Behavior (Your Understanding is Correct)

Your logic is right:
- 46 buses in the roster
- 3 buses have `trips_per_day = 2`, so **49 total trip rows** in expandedRows
- Only buses with remark = "Running" should create trips
- Buses marked "Hire", "Repair", "Stopped", "Accident", "Sold" should NOT create trips

## Issues Found

### Issue 1: "Create Remaining" count is wrong (shows 42)
The count at line 75 of `FleetMasterSpreadsheet.tsx` filters `expandedRows` (which has 49 rows including multi-trip expansions) but only checks `remark === 'Running' || !remark`. It should match the **actual trip creation logic** which works on the `roster` level, not expanded rows.

The trip creation function (line 509) correctly filters: `roster.filter(r => r.is_active && r.bus_id && r.remark === 'Running')` — only strict "Running", then creates `trips_per_day` trips per bus.

The mismatch: the UI count uses `expandedRows` with a loose filter, but creation uses `roster` with a strict filter. They need to align.

### Issue 2: Trip creation skips entire bus if ANY trip exists
Line 548: `if (existingBusTrips.has(row.bus_id!)) continue;` — this skips the bus entirely if it already has any trip. But if a bus has `trips_per_day = 2` and only trip 1 was created, clicking "Create Remaining" won't create trip 2. It should check per-trip-sequence, not per-bus.

## Fix

### Step 1: Align "Create Remaining" count with actual creation logic
In `FleetMasterSpreadsheet.tsx`, calculate the count based on roster-level eligible buses and their `trips_per_day`, minus already-created trips — matching exactly what `confirmAndCreateTrips` would do.

### Step 2: Fix trip creation to handle partial multi-trip buses
In `useFleetMasterSpreadsheet.ts` line 524-548, instead of tracking which buses have ANY trip, track how many trips each bus already has. Then only create the missing trip sequences.

Current (broken for multi-trip):
```
const existingBusTrips = new Set(existingTrips.map(t => t.bus_id));
if (existingBusTrips.has(row.bus_id!)) continue; // skips entire bus
```

Fixed:
```
const existingTripCounts = {};
existingTrips.forEach(t => { existingTripCounts[t.bus_id] = (existingTripCounts[t.bus_id] || 0) + 1; });
// Then only create trips for sequences beyond existing count
const existingCount = existingTripCounts[row.bus_id] || 0;
for (let seq = existingCount + 1; seq <= row.trips_per_day; seq++) { ... }
```

## Files to Change
- `src/components/fleet/FleetMasterSpreadsheet.tsx` — fix eligible count to use roster-based calculation with trips_per_day
- `src/hooks/useFleetMasterSpreadsheet.ts` — fix partial multi-trip creation (lines 524-548)

## Result
- "Create Remaining" shows correct number (e.g., 49 total eligible trips minus already created)
- Changing remark to "Hire"/"Repair"/etc. excludes that bus from count and creation
- Multi-trip buses (trips_per_day=2) correctly create remaining trips even if some already exist

