

# Fix Fleet Master Spreadsheet: Trip Count, Driver/Conductor, and Interconnection

## Problems Found

### 1. Driver & Conductor names show "N/A" in Daily Trips
**Root cause**: `confirmAndCreateTrips()` stores notes as a plain string:
```
"Driver: John, Conductor: Jane"
```
But **every other part of the system** (Daily Trips page, Crew Grouping, Analytics, Leaderboard) expects JSON:
```json
{"driver": "John", "conductor": "Jane"}
```
This is why the Daily Trips page shows "Driver: N/A • Conductor: N/A".

### 2. Trip count (trips_per_day) editing
The cell is technically editable, but when changed, the system correctly refetches and re-expands rows. If the user sets trips_per_day to 2, the bus should show 2 rows in the spreadsheet AND "Create Trips" should create 2 trip records for that bus. This part works in code but the `notes` format breaks the downstream display.

### 3. Excel import doesn't set trips_per_day from the "Trip" column
The Excel file has a "Trip" column (e.g., value `1`), but the import hardcodes `trips_per_day: 1` and ignores the Excel value.

## Plan

### File 1: `src/hooks/useFleetMasterSpreadsheet.ts`
**Fix `confirmAndCreateTrips` — store notes as JSON object** (line 227):
```typescript
// BEFORE (broken)
notes: `Driver: ${row.default_driver || 'N/A'}, Conductor: ${row.default_conductor || 'N/A'}`,

// AFTER (matches system-wide expectation)
notes: JSON.stringify({
  driver: row.default_driver || null,
  conductor: row.default_conductor || null,
}),
```

### File 2: `src/components/fleet/FleetExcelImport.tsx`
**Read "trip" column from Excel and set `trips_per_day`** in the roster insert (line 313):
- Parse the `trip` value from the Excel row (already in `ImportRow` as `turn01` or we need to use the existing `trip` header detection)
- Actually, looking at the header map, `trip` is already detected. We need to add it to `ImportRow` and use it when inserting:

```typescript
// In parseExcelRows, capture trip count
trip: parseInt(getVal(r, 'trip')) || 1,

// In handleImport, use it:
trips_per_day: row.trip || 1,  // instead of hardcoded 1
```

Wait — the `ImportRow` interface doesn't have a `trip` field. The header map has `trip: ['trip', 'trips', 'trip no']` but it's not being captured. Need to add it.

### File 3: `src/hooks/useFleetMasterSpreadsheet.ts`  
**Also read driver/conductor from trip notes JSON** when expanding rows, so the driver shows even after trips are created. Currently line 147 sets `driver_name: row.default_driver` — but if a trip already exists with JSON notes, use those:

```typescript
// Extract driver/conductor from existing trip notes
const tripNotes = matchedTrip?.notes ? 
  (typeof matchedTrip.notes === 'string' ? 
    (() => { try { return JSON.parse(matchedTrip.notes); } catch { return {}; } })() 
    : matchedTrip.notes) 
  : {};

driver_name: tripNotes.driver || row.default_driver,
conductor_name: tripNotes.conductor || row.default_conductor,
```

## Summary of Changes

| File | Change |
|---|---|
| `src/hooks/useFleetMasterSpreadsheet.ts` | Fix notes to JSON format; read driver/conductor from trip notes |
| `src/components/fleet/FleetExcelImport.tsx` | Add `trip` field to ImportRow; use Excel trip count for `trips_per_day` |

