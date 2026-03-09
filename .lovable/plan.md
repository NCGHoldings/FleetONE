

# Fix Fleet Sheet: Larger Cells + Auto-Save Without Scroll Reset

## Problems
1. **Cells still too small** — the screenshot shows data entry areas are cramped; inputs and clickable spans need more height/padding
2. **After editing a cell and pressing Enter, the spreadsheet refreshes and scrolls to the top** — the `fetchRoster()` call sets `loading=true`, which unmounts the table and remounts it at scroll position 0
3. **User has to manually refresh** — they want seamless inline save that keeps their position

## Changes

### 1. Larger cells & inputs — `FleetMasterSpreadsheetCore.tsx`
- Increase input height from `h-8` to `h-9` (36px)
- Increase clickable span padding from `px-2 py-1` to `px-2 py-2`
- Add `min-h-[36px]` to all `TableCell` elements
- Increase column widths further: financial columns `w-28` → `w-32`, crew columns `min-w-[120px]` → `min-w-[140px]`, route `min-w-[160px]` → `min-w-[180px]`

### 2. Prevent scroll reset on save — `useFleetMasterSpreadsheet.ts`
- **Remove `setLoading(true)` from `fetchRoster` when it's called as a background refresh** — add an optional `silent` parameter: `fetchRoster(silent?: boolean)` that skips `setLoading(true)`
- In `updateField`: call `fetchRoster(true)` (silent) so the table never unmounts/remounts
- For roster field updates (non-trip fields), keep optimistic local state update (`setExpandedRows`) and only call silent `fetchRoster` for `trips_per_day` changes

### 3. Preserve scroll position — `FleetMasterSpreadsheetCore.tsx`
- Store a `ref` on the scrollable container div
- Before any data refresh, save `scrollTop` and `scrollLeft`
- After rows re-render (via `useEffect` on `rows`), restore the saved scroll position
- This ensures the user stays exactly where they were after an edit

### 4. Auto-advance to next cell (optional UX improvement)
- On Enter key, after committing, move focus to the next editable cell below (same column, next row) instead of just closing the editor — making bulk data entry faster

