

# Fix Calendar View: Deduplicate Quotation Versions

## Problem
The calendar view shows **multiple version cards for the same hire** (e.g., QUO-2026-1109-v1.0 and v1.1 both appear). Even though the query filters `is_active_version = true`, it seems both versions have this flag set (likely a data issue from the edit flow). The user wants:
1. Only **one card per hire** (grouped by base quotation)
2. Default to the **latest version**
3. A **dropdown on each card** to switch between versions

## Plan

### 1. Change the query to fetch ALL versions (remove `is_active_version` filter)
Since we need version switching, fetch all versions for the selected date, then group client-side.

### 2. Group quotations by parent quotation
After fetching, group by `parent_quotation_id` (or `id` if no parent). For each group:
- Sort versions by `version_number` descending
- Default display = the one with `is_active_version = true`, or latest version
- Store all versions in the group for the dropdown

### 3. Add version selector dropdown to each hire card
In the card header, next to the quotation number, add a small `<Select>` dropdown listing all versions (e.g., "v1.0", "v1.1"). Selecting a version swaps the displayed data for that card without affecting other cards.

### File: `src/components/special-hire/SpecialHireCalendarView.tsx`

**Data layer changes:**
- Remove `.eq('is_active_version', true)` from `loadQuotationsForDate` query
- Add a grouping step after fetch: group by base quotation number (strip `-vX.X` suffix) or `parent_quotation_id`
- New state: `selectedVersions: Record<string, string>` mapping base quotation ID → selected version ID
- New memo `groupedHires` that produces one entry per hire with `{ displayQuotation, allVersions }[]`

**UI changes (card rendering):**
- Replace direct `quotations.map()` with `groupedHires.map()`
- Add a small version `<Select>` in each card header (only shown when versions > 1)
- When version is changed via dropdown, update `selectedVersions` state to swap the displayed quotation data
- Update stats to count unique hires (not versions)

**Also update `loadMonthDates`:**
- Keep the `is_active_version` filter here (or deduplicate by base quotation) so calendar dots aren't inflated

