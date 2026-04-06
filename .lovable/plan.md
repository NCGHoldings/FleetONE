

# Add Confirmation Dialog Before Creating/Removing Trips in Daily Mode

## Problem
When a user changes Trips/Day in "Today Only" mode, trips are created or removed immediately without any confirmation. The user wants to review the action details (bus, date, how many trips will be added/removed) before it happens.

## Solution
Add a confirmation dialog that appears when `trips_per_day` is edited in daily mode. The dialog shows:
- Bus number and date
- Current trip count → new trip count
- What will happen (e.g., "2 new trip(s) will be created" or "1 trip(s) will be removed")
- Confirm / Cancel buttons

### Architecture
Since `updateField` is in a hook (not a component), the confirmation state needs to live in the Core component and intercept the update before it reaches the hook.

### 1. Modify `src/components/fleet/FleetMasterSpreadsheetCore.tsx`
- Add state for a pending trips confirmation: `{ rosterId, busNo, currentTrips, newTrips, date }`
- Before calling `onUpdate` for `trips_per_day` in daily mode, intercept and show an `AlertDialog` with action details
- On confirm → call `onUpdate(rosterId, 'trips_per_day', newValue)`
- On cancel → discard

### 2. Add confirmation UI
- Use existing `AlertDialog` component
- Show: "Change Trips for [Bus] on [Date]?"
- Details: "Current: X trip(s) → New: Y trip(s)" and "This will create/remove Z trip record(s) for this date only. Master roster will not be changed."
- Buttons: "Cancel" and "Confirm"

### 3. Props extension
- Add `editMode` and `selectedDate` to the Core component props so it can determine when to show the dialog and what date to display

## Files
- **Modify**: `src/components/fleet/FleetMasterSpreadsheetCore.tsx` — add AlertDialog for trips_per_day confirmation in daily mode
- **Modify**: Parent component that renders Core — pass `editMode` and `selectedDate` props

## Result
- User sees exactly what will happen before trips are created or removed
- Shows bus number, date, current vs new count, and action description
- Can cancel safely before any database changes occur

