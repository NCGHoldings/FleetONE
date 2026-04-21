
# Add inline Driver / Conductor edit on Daily Trips (with autocomplete + auto-add)

## What you want
On the Daily Trips page (`/trips`), the "Driver: N/A • Conductor: N/A" row inside each trip should be editable inline — same simple pattern as Revenue and Expenses. Each field should:
- Show a dropdown of existing drivers / conductors (from staff registry).
- Allow free typing of a brand new name.
- When a new name is saved, automatically add it to the staff registry so it appears in the dropdown next time and in the autocomplete suggestion list everywhere.

## Where it goes
File: `src/components/trips/BusDailySummaryTable.tsx` — the line that currently renders:
```
Driver: {trip.driver_name} • Conductor: {trip.conductor_name}
```
We'll add a small `Pencil` button next to it (matching the Revenue edit button pattern at line 393–410) that opens a small inline edit modal.

## How it will work (atomic and matches existing pattern)

### 1. New component: `src/components/trips/InlineCrewEditor.tsx`
Mirrors `InlineRevenueEditor.tsx` exactly:
- Same `Dialog` shell, same Save / Cancel footer.
- Two combobox fields: **Driver** and **Conductor**.
- Each combobox = `Command`/`Popover` (shadcn) with:
  - Type-to-search input.
  - Filtered list of existing staff from `staff_registry` (filtered by `staff_type = 'driver'` or `'conductor'`, only `is_active = true`).
  - "Use [typed name]" option appears at the bottom when the typed value doesn't exist — clicking it accepts the new name.
- On Save:
  1. Read current `daily_trips.notes` for that trip.
  2. Merge `{ driver, conductor }` into the JSON (preserve all other notes keys).
  3. `update daily_trips set notes = ... where id = trip.id`.
  4. For any new name (not already in `staff_registry`), insert into `staff_registry` with sensible defaults:
     - `staff_name` = typed name
     - `staff_type` = `'driver'` or `'conductor'`
     - `salary_type` = `'monthly'`
     - `monthly_salary` = `0`
     - `is_active` = `true`
  5. Toast success and call `onSaved()` to refresh the parent list.

### 2. Hook the editor into `BusDailySummaryTable.tsx`
- Add new state `editingCrewTrip` (same shape as `editingTrip`).
- Replace the current static driver/conductor `<div>` (lines 317–322) with a flex row that includes a small `Pencil` button identical in style to the Revenue one. Clicking sets `editingCrewTrip`.
- Render `<InlineCrewEditor isOpen={!!editingCrewTrip} trip={editingCrewTrip} onClose={...} onSaved={onRefresh} />`.

### 3. Autocomplete data source (typeahead suggestions everywhere)
- The combobox queries `staff_registry` directly (the same source used by HR Hub, Staff Performance and Driver Allocation). Because new names are saved back to that table, every other place that reads from `staff_registry` will pick up the suggestion automatically — no further work needed for "next time" suggestions.
- Trip data parser (`useDailyBusGroupedTrips.ts` line 234) already reads `notes.driver` / `notes.conductor`, so the new value is rendered immediately after refresh.

## Safety / scope
- Only the inline display row changes — no table layout, no column changes.
- `notes` JSON is read-merge-write so other keys (turn times, etc.) are preserved.
- Empty input clears the field (sets `notes.driver` / `.conductor` to empty string).
- Insert into `staff_registry` is wrapped in try/catch — if the staff insert fails, the trip update still succeeds and a soft toast warns "Saved trip but couldn't add to staff registry".
- Does not change finance, GL posting, or any other module.

## Files touched
| File | Change |
|---|---|
| `src/components/trips/InlineCrewEditor.tsx` | **new** — dialog + 2 comboboxes + save handler |
| `src/components/trips/BusDailySummaryTable.tsx` | replace static driver/conductor text with editable row + pencil button + render new editor |

## Result
- Click pencil next to "Driver: N/A • Conductor: N/A" on any trip in `/trips`.
- Pick from the dropdown of existing staff, or type a new name and confirm.
- Save → trip updates, new names get added to staff registry, dropdown gets richer for the next trip you edit.
