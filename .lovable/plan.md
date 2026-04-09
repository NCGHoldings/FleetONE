

# Special Hire Spreadsheet — Improved Section-Based View with Frozen Columns

## Problem

The Special Hire spreadsheet has 55+ columns across 6 sections. The existing Focus Mode and section toggle buttons are too subtle — users still can't easily find what they've typed, and there's no frozen column behavior like the Fleet Sheet. The section pills at the top are tiny and easy to miss.

## Solution

### 1. Freeze first 3 identity columns (sticky left)

Make columns `#`, `Quotation No`, and `Bus No` sticky on the left side so they remain visible while scrolling horizontally through any section. This matches how the Fleet Sheet keeps `No` and `Bus` visible.

**File**: `SpecialHireSpreadsheetCore.tsx`
- Add `sticky left-0 z-10 bg-card` to the first 3 `<td>` and `<th>` elements
- Use incremental `left-[Xpx]` values for each frozen column
- Add a subtle right border/shadow on the last frozen column

### 2. Replace tiny pills with proper section selector dropdown + toggle chips

Replace the current small pills with:
- A proper **multi-select chip bar** with larger, clickable section toggles that clearly show ON/OFF state
- A **"Show All" / "Show Only"** quick action per section
- Keep Focus Mode but rename to **"Section View"** with a proper Select dropdown to pick which section to focus on

**File**: `SpecialHireSpreadsheetCore.tsx`
- Larger toggle buttons with icons per section (Bus icon for Hire Info, Settings for Operations, FileText for Invoice, Gauge for Meter, Wallet for Expenses, BarChart for Summary)
- Active sections are solid-colored, inactive are ghost/outline
- "All Sections" button to reset

### 3. Wider cells in Focus/Section mode

When only one section is active alongside identity columns, give each editable cell more width (`min-w-[120px]` instead of `min-w-[80px]`) so there's more room for data entry.

**File**: `SpecialHireSpreadsheetCore.tsx`
- Add conditional `min-w` classes based on whether `focusMode && focusedSection` is active
- In focus mode, the identity columns shrink to just `#`, `Q.No`, `Bus No`, `Status` (already done)

### 4. Scroll position preservation

Like the Fleet Sheet, save and restore scroll position when data updates so users don't lose their place after editing a cell.

**File**: `SpecialHireSpreadsheetCore.tsx`
- Add `scrollContainerRef` and `savedScrollRef` pattern from FleetMasterSpreadsheetCore
- Save position before `onUpdate`, restore after re-render

## Files to Change

- **`src/components/special-hire/spreadsheet/SpecialHireSpreadsheetCore.tsx`** — frozen columns, improved section toggles, wider cells in focus mode, scroll preservation

## Result

- First 3 columns (row number, quotation, bus) stay visible while scrolling horizontally
- Section toggles are large, clear, and easy to use
- Focus/Section mode gives much more editing space per cell
- Scroll position preserved after edits — no jumping back to top
- Same data, same functionality, just much more user-friendly navigation

