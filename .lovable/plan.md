

# Fleet Sheet — Auto-Expanding Cells & Better Data Entry Space

## Problem

The Fleet Sheet cells are too narrow (80px default) with `truncate` that clips content. When editing, the input is fixed at `h-9` (36px) with no room to see what you're typing. Data entry feels cramped — you can't see full values, and after saving the text gets truncated again.

## Solution

### 1. Auto-expanding input on edit

When a cell enters edit mode, the input should expand wider than the cell using `absolute` positioning so the user can see the full value being typed. After saving, the cell returns to normal size but shows the value with a tooltip on hover.

**File**: `FleetMasterSpreadsheetCore.tsx` — `renderEditableCell` function (line 196-236)

Changes to the editing input (line 202-213):
- Wrap in a `relative` container
- Make the input `absolute` with `min-w-[200px]` and `z-50` so it floats above neighboring cells
- Add `whitespace-nowrap` auto-width behavior

Changes to the display span (line 227-235):
- Remove `truncate` — use `overflow-hidden text-ellipsis` with `max-w` but show full text on hover via `title`
- Increase default row height from `min-h-[36px]` to `min-h-[40px]`

### 2. Increase default cell widths

Current `min-w-[80px]` is too narrow for most data. Increase defaults:
- Normal mode: `min-w-[100px]` (was 80px)
- Focus mode: `min-w-[160px]` (was 140px)
- Numeric cells (KM, Fuel, Financial): `min-w-[120px]` normal, `min-w-[180px]` focus

Line 108: Change `cellMinWidth` values

### 3. Dropdown cells also need more space

The `Select` and `Popover` components for Route, Driver, Conductor, Bus Type, Permit, Remark also feel cramped. Increase their trigger widths and ensure the display text isn't clipped.

**File**: `FleetMasterSpreadsheetCore.tsx`
- `renderDropdownCell` (line 254): increase `SelectTrigger` padding
- `renderRouteCell` (line 282): the button already has good width
- `renderCrewCombobox` (line 352): increase trigger padding

### 4. Table cell padding improvements

All `<TableCell>` elements currently use `py-1` or `py-2`. Standardize to `py-2 px-1` for consistent spacing.

Lines 636-708: Adjust `TableCell` className padding

## Files to Change

- **`src/components/fleet/FleetMasterSpreadsheetCore.tsx`** — auto-expanding edit inputs, wider default cells, better padding, dropdown spacing

## Result

- Edit inputs expand to show full value while typing (float above other cells)
- Default cell widths increased so data is readable without editing
- Focus mode gives even more generous space
- All cell text visible on hover via tooltip even when truncated
- Consistent padding across all cell types

