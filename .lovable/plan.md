

# Daily Trips Page — Structure Guide and Issues Found

## How This Page Works

The `/trips` page is the **NCG Express Operations** hub with 6 tabs:

```text
┌──────────────────────────────────────────────────────┐
│  Daily Trips │ Fleet Sheet │ Bus P&L │ Route P&L │ ...│
└──────────────────────────────────────────────────────┘
```

1. **Daily Trips** — Shows bus-level trip summaries (table/card/crew views) with revenue, expenses, profit. Data comes from `daily_trips` + `daily_bus_expenses` tables.
2. **Fleet Sheet** — The Master Roster spreadsheet (what you see in screenshot). Shows all rostered buses with routes, drivers, conductors, and allows inline editing.
3. **Bus P&L / Route P&L** — Profitability reports.
4. **Cashier Sett. / Bank Deposit** — Settlement and deposit dashboards.

### Why KPIs Show Zero

The KPIs (Revenue, Expenses, Net Income, Mileage, Fuel) show LKR 0.00 because **no trips have been created for today (April 8th)**. The toast "No trip generated — You must click 'Create Trips' for today before you can override daily values" confirms this.

**Workflow**: Master Roster → Click "Create Trips" button → This generates `daily_trips` records for today → Then you can enter income/expense data → KPIs update.

## Issues Found

### Issue 1: Fleet Sheet has its own date picker that is separate from Daily Trips date picker
The Fleet Sheet component (`FleetMasterSpreadsheet`) has its own internal `selectedDate` state (line 20) that is **independent** from the parent page's date. When you switch between tabs, the dates can be out of sync. The parent page's date controls only affect the Daily Trips tab, not Fleet Sheet.

**Fix**: Pass the parent page's `selectedDate` down to `FleetMasterSpreadsheet` so both tabs use the same date.

### Issue 2: "Buses Running" count only counts roster entries with remark = 'Running'
Line 656: `roster.filter(r => r.remark === 'Running').length` — this works correctly, but if buses have no remark set, they won't be counted. Some roster entries may have null/empty remarks.

**Fix**: Count buses where `remark === 'Running' || !remark` (default to counting if no remark set), or ensure all roster entries have a remark.

### Issue 3: Daily mode edit shows confusing toast when no trips exist
When editMode is 'daily' and you try to edit a field, it shows "No trip generated" toast (line 418). This is correct behavior but the user experience is confusing — it should be clearer that you need to create trips first.

**Fix**: Add a visible banner/alert at the top of the Fleet Sheet when no trips exist for the selected date, with a prominent "Create Trips" CTA.

### Issue 4: Excessive debug logging in production
The `useDailyBusGroupedTrips` hook has ~15 `console.log` debug statements that run on every data fetch. These should be removed or gated behind a debug flag.

**Fix**: Remove or wrap all debug console.log statements.

## Implementation Plan

### Step 1: Sync Fleet Sheet date with parent page date
In `DailyTrips.tsx`, pass `selectedDate` to `FleetMasterSpreadsheet`:
```tsx
<FleetMasterSpreadsheet initialDate={selectedDate} />
```
Update `FleetMasterSpreadsheet` to accept and use `initialDate` prop.

### Step 2: Add "No Trips" banner to Fleet Sheet
When no trips exist for the selected date, show a clear alert with "Create Trips" button instead of relying on toast messages.

### Step 3: Fix "Buses Running" count
Default to counting buses that have remark = 'Running' OR null/empty remark (since most buses are running by default).

### Step 4: Clean up debug logging
Remove excessive `console.log` statements from `useDailyBusGroupedTrips.ts`.

## Files to Change
- `src/pages/DailyTrips.tsx` — pass date to Fleet Sheet
- `src/components/fleet/FleetMasterSpreadsheet.tsx` — accept initial date prop, add no-trips banner
- `src/hooks/useFleetMasterSpreadsheet.ts` — fix bus count logic
- `src/hooks/useDailyBusGroupedTrips.ts` — remove debug logs

## Result
- Fleet Sheet and Daily Trips tabs share the same date
- Clear visual indicator when trips haven't been created yet
- Accurate "Buses Running" count
- Clean console output without debug noise

