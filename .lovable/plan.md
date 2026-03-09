

# Fix Fleet Sheet Spreadsheet — Improve Cell Sizes and Usability

## Problem
The Fleet Sheet table cells are too small and cramped for data entry. Text is `text-xs` (12px), inputs are `h-7` (28px), column widths are very narrow (e.g., `w-14`, `w-16`, `w-18`), and clickable areas are tiny — making it difficult to read and edit data.

## Changes — `src/components/fleet/FleetMasterSpreadsheetCore.tsx`

### 1. Increase text size from `text-xs` to `text-sm`
All `TableHead` and `TableCell` elements currently use `text-xs` (12px). Change to `text-sm` (14px) for better readability.

### 2. Increase input/cell height
- Edit inputs: `h-7` → `h-8` with `text-sm` and more padding (`px-2`)
- Clickable display spans: add `py-1` padding for a larger click target
- Select triggers: `h-7` → `h-8`

### 3. Widen narrow columns
Update `TableHead` minimum/fixed widths:
- Bus: `min-w-[70px]` → `min-w-[80px]`
- Route: `min-w-[140px]` → `min-w-[160px]`
- Trip: `w-14` → `w-16`
- Bus Type / Permit / Remark: `w-20` → `w-24`
- Trips/Day / Turn cols: `w-16` → `w-20`
- Start/End KM, Fuel, KM/L, Std Rate: `w-18`/`w-20` → `w-24`
- Financial cols: `w-20`/`w-24` → `w-28`
- Driver/Conductor: `min-w-[100px]` → `min-w-[120px]`
- Model: `min-w-[80px]` → `min-w-[100px]`

### 4. Increase row padding
- `TableCell` padding via the table row — currently tight; add `py-1.5` to cells for breathing room
- Section header row: `py-1.5` → `py-2`

### 5. Container max height
- `max-h-[75vh]` → `max-h-[80vh]` to show more rows

These changes make the spreadsheet more like a real data-entry tool with comfortable tap/click targets and readable text, while keeping the dense spreadsheet feel.

