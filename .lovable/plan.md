

# Fix: Special Hire Quotation Export - Single Date, Today Button, and Sri Lankan Time

## Problems

1. **No single-date option** -- You can only pick a "from" and "to" date separately, but there's no way to export for just one specific date
2. **No "Today" quick button** -- To export today's quotations you have to manually pick today's date twice
3. **Time zone mismatch** -- Date comparisons use browser local time but don't properly handle Sri Lankan timezone (UTC+5:30), so quotations created today in Sri Lanka may not match
4. **End-of-day not handled** -- When you pick a "to" date, it compares against midnight (start of day), so quotations created during that day are excluded

## Solution

### File: `src/components/special-hire/SpecialHireExportModal.tsx`

**1. Add quick-select date buttons: "Today", "This Week", "This Month", "All Time"**

Add preset buttons above the date pickers so you can quickly select common ranges with one click. "Today" will set both from and to to today's date.

**2. Support single-date selection**

Add a toggle or allow picking just one date. When only "from" is set (or both are the same date), the filter treats it as "that entire day."

**3. Fix date comparison to use end-of-day for the "to" date**

Update `filterDataByDateRange` to:
- Set the "to" date's time to 23:59:59.999 so all quotations created on that day are included
- Convert comparison dates to Sri Lankan timezone (UTC+5:30) before comparing
- When from === to (single date), filter for that full day

**4. Add Sri Lankan timezone handling**

Since `created_at` is stored in UTC in the database, convert it to Sri Lankan time (UTC+5:30) before comparing with the selected date range. This ensures a quotation created at 11 PM Sri Lankan time (which is 5:30 PM UTC) matches correctly.

### Updated `filterDataByDateRange` logic

```text
function filterDataByDateRange(data):
  if no dates selected: return all data
  
  // Sri Lankan offset: +5:30
  SL_OFFSET_MS = 5.5 * 60 * 60 * 1000
  
  fromStart = from date at 00:00:00 Sri Lankan time (converted to UTC)
  toEnd = to date at 23:59:59.999 Sri Lankan time (converted to UTC)
  
  // If only "from" set, treat as single day
  if from but no to: toEnd = from date at 23:59:59.999 SL time
  if to but no from: fromStart = to date at 00:00:00 SL time
  
  filter each quotation where compareDate >= fromStart AND compareDate <= toEnd
```

### Quick-select buttons

```text
[Today] [This Week] [This Month] [All Time]
```

- **Today**: Sets from = to = today
- **This Week**: from = Monday, to = today
- **This Month**: from = 1st of month, to = today  
- **All Time**: Clears both dates

### UI Changes

- Add a row of quick-select preset buttons between the "Filter By Date" radio and the date pickers
- When a preset is clicked, both from and to are auto-filled
- Keep the manual date pickers for custom ranges
- Update the export summary text to show "Single date: Feb 25, 2025" when from === to

## Files to Change

- `src/components/special-hire/SpecialHireExportModal.tsx` -- Add presets, fix date filtering logic with SL timezone, handle single-date and end-of-day

