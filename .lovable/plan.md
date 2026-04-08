

# Fix Old Running Routes & Add Driver/Conductor Dropdowns

## Issues to Fix

### 1. "OLD RUNNING ROUTES" buses should default to "Stopped"
Currently buses under the "OLD RUNNING ROUTES" section show as "Running" — these are legacy/retired routes and should be marked "Stopped" by default so they don't count toward trip creation.

**Fix**: SQL migration to update `fleet_master_roster.remark = 'Stopped'` for all rows where `section = 'OLD RUNNING ROUTES'` and remark is currently 'Running'.

### 2. Driver & Conductor fields are free-text — should be searchable dropdowns
Currently Driver and Conductor are plain text inputs (click-to-edit). Users can type anything, leading to inconsistent names. These should be **combobox dropdowns** populated from the existing roster data (unique driver/conductor names already entered across all roster rows), similar to how the Route field works.

**Fix**: In `FleetMasterSpreadsheetCore.tsx`:
- Collect unique driver and conductor names from all roster rows
- Replace `renderEditableCell` for driver/conductor with a combobox (like route selector)
- Allow both selection from existing names AND typing new names
- Show matching suggestions as the user types

### 3. Odometer system location guide
The odometer management is in **Real-Time Tracking** page (`/real-time-tracking`):
- "Odometer Overview" button shows all buses' odometer status
- Individual bus cards have "Set Odometer" for manual entry
- "Adjust" button for corrections
- The Fleet Sheet also has Start KM / End KM columns for daily entry

No code change needed — just guidance (provided below).

## Technical Details

### File: New SQL migration
```sql
UPDATE fleet_master_roster 
SET remark = 'Stopped' 
WHERE section = 'OLD RUNNING ROUTES' 
  AND (remark = 'Running' OR remark IS NULL);
```

### File: `src/components/fleet/FleetMasterSpreadsheetCore.tsx`

**Extract unique names from rows**:
```typescript
const uniqueDrivers = [...new Set(rows.map(r => r.default_driver).filter(Boolean))].sort();
const uniqueConductors = [...new Set(rows.map(r => r.default_conductor).filter(Boolean))].sort();
```

**New `renderCrewCombobox` function** — reuse the same Popover+Command pattern as `renderRouteCell`:
- Shows current name or placeholder
- Searchable list of existing names from the roster
- User can type and select, or type a completely new name
- Replaces the current free-text `renderEditableCell` calls for `default_driver` and `default_conductor` (lines 393-394)

## Odometer System Location
The odometer features are on the **Real-Time Tracking** page (sidebar → "Real-Time Tracking"). There you'll find:
- **Odometer Overview** button — shows all buses with their current readings
- Per-bus **Set Odometer** / **Adjust** buttons
- The **Fleet Sheet** (Daily Trips → Fleet Sheet tab) also has Start KM and End KM columns for daily odometer entry

## Files to Change
- New SQL migration — set "OLD RUNNING ROUTES" buses to "Stopped"
- `src/components/fleet/FleetMasterSpreadsheetCore.tsx` — replace driver/conductor free-text with searchable combobox dropdowns

## Result
- Old route buses automatically marked "Stopped" — won't generate trips
- Driver/Conductor fields show searchable dropdowns with existing names
- Users can still type new names not in the list
- Consistent crew naming across the roster

