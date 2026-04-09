

# Fleet Master Spreadsheet — Section Toggle & Frozen Columns (Like Special Hire)

## Problem

The Fleet Sheet has 25 columns across 6 groups but no way to hide/show sections. All columns are always visible, making it hard to focus on data entry (e.g., just Meter/Fuel or just Financials). Only the `No` column is sticky — `Bus` scrolls off screen. The Special Hire sheet now has section toggles, frozen columns, and focus mode, but Fleet Sheet has none of this.

## Solution

### 1. Freeze first 2 identity columns (No + Bus)

Make `No` and `Bus` sticky left so they're always visible while scrolling horizontally.

- `No` → `sticky left-0 z-30` (width: 56px)
- `Bus` → `sticky left-[56px] z-30` with right shadow on last frozen column
- Apply same sticky to both `<TableHead>` and `<TableCell>` rows
- Both group header row cells for "Bus Info" also get sticky treatment

### 2. Add section toggle chip bar (same pattern as Special Hire)

Add a row of toggle chips above the table for the 6 column groups:

| Chip | Columns | Icon |
|------|---------|------|
| Route & Type | Route, Trip, Bus Type, Permit | MapPin |
| Config | Trips/Day | Settings |
| Status | Remark | Activity |
| Crew | Driver, Conductor | Users |
| Turns | Turn 01, Turn 02 | Clock |
| Meter / Fuel | Model, Start KM, End KM, Mileage, Fuel, KM/L, Std Rate, Perform | Gauge |
| Financials | Target, Passenger, Luggage, Expenses, Net | Wallet |

- "All" button to show everything (default)
- Click a chip to toggle that section on/off
- Active = solid colored, inactive = outline/ghost
- Section group header `colSpan` values adjust dynamically based on visible sections

### 3. Focus mode — single section with wider cells

When only 1 section is active:
- Cell min-width increases from default to `140px`
- More room for data entry
- Identity columns (No + Bus) always shown

### 4. Adjust frozen column backgrounds

Both header and body frozen cells need proper `bg-card` / `bg-background` classes so content doesn't bleed through when scrolling.

## Files to Change

- **`src/components/fleet/FleetMasterSpreadsheetCore.tsx`** — add section toggle state, conditional column rendering, sticky Bus column, focus mode wider cells

## Result

- No + Bus columns always visible while scrolling horizontally
- Users can toggle which column groups are visible (same UX as Special Hire)
- Focus on just Meter/Fuel for odometer entry, or just Financials for income review
- Same data, same editing — just much easier to navigate

