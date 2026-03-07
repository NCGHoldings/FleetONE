

# Fix Excel Import: Auto-Detect Columns and Handle All Buses

## Problems Identified

1. **Day Target shows "193158"** — the column indices are hardcoded and may not match your actual Excel layout. The parser needs to auto-detect column positions from the header row instead of assuming fixed positions.

2. **24 unmatched buses** — these bus numbers from your Excel don't exist in the `buses` table. For example, your Excel has "NI 8220" but the database has "NG 8220". The current behavior correctly skips these (as you requested).

3. **500 Internal Server Errors** visible in your network panel — likely from other API calls, but need to ensure the import itself doesn't hit errors.

## Plan

### 1. Smart Header Detection in `FleetExcelImport.tsx`
Instead of hardcoded column indices (col 1 = Bus, col 8 = Driver, etc.), scan the first few rows to find the header row by matching known column names ("Bus", "Driver", "Conductor", "Day Target", etc.), then use those positions dynamically. This handles Excel files with different column orders or extra columns.

### 2. Auto-Create Missing Buses Option
Add a checkbox: **"Create missing buses in system"** — when enabled, unmatched bus numbers get inserted into the `buses` table automatically before importing to roster. When disabled (default), unmatched buses are rejected as currently.

### 3. Show Unmatched Bus Details
In the preview table, show the exact bus numbers that don't match so you can decide whether to auto-create them or fix them in your Excel first.

### 4. Better Day Target Parsing
Handle Excel number formats — if a cell contains a date serial number instead of a target amount, detect and skip it. Also handle comma-formatted numbers.

## Files Changed

| File | Change |
|---|---|
| `src/components/fleet/FleetExcelImport.tsx` | Replace hardcoded column indices with header-row auto-detection; add "create missing buses" toggle; improve number parsing |

