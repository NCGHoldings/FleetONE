

# Add "View Mode" Toggle to Special Hire Calendar

## What the user wants
Currently the calendar only shows quotations whose **pickup date** matches the selected date. The user wants a toggle to switch between:
1. **Hires on Date** (current behavior) — quotations with `pickup_datetime` on selected date
2. **Created on Date** (new) — quotations with `created_at` on selected date

## Changes — Single file: `src/components/special-hire/SpecialHireCalendarView.tsx`

### 1. Add toggle state
Add a `viewMode` state: `'hires' | 'created'` defaulting to `'hires'`.

### 2. Update `loadQuotationsForDate`
When `viewMode === 'created'`, filter by `created_at` instead of `pickup_datetime`:
```
.gte('created_at', dayStart.toISOString())
.lt('created_at', dayEnd.toISOString())
```

### 3. Update `loadMonthDates`
Same logic — use `created_at` when in "created" mode so calendar dots reflect the correct dates.

### 4. Add `viewMode` to useEffect dependencies
Both data-loading effects need to re-run when `viewMode` changes.

### 5. Add toggle UI
Place a segmented toggle (using existing `Tabs` or two `Button` variants) in the left panel header, below "Select Date":
- **Hires on Date** — shows trips happening that day
- **Created on Date** — shows quotations created that day

Also update the right panel header label to reflect which mode is active (e.g. "Hires on Tuesday..." vs "Quotations created on Tuesday...").

