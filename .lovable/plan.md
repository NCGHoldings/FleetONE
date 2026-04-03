

# Fix GL Export: Sections Not Reflecting Customization

## Problem
The exported Excel file always looks the same regardless of which sections are checked/unchecked. Two issues:

1. **Line Items sheet never appears**: The condition `options.includeLineItems && lineItems.length > 0` means if the Supabase fetch returns empty (e.g., FK join issue with `chart_of_accounts`), the sheet is silently skipped even when the user checked it.

2. **Options state may not reset between opens**: The modal keeps previous state when reopened, so toggling has no visible effect if user doesn't notice the checkboxes.

## Fix

### 1. `src/components/accounting/GLExcelExporter.ts`
- Remove `lineItems.length > 0` guard — if user checks "Line Items", always add the sheet (show empty table with headers if no data)
- Add a "No data" row when line items array is empty so user sees the sheet exists

### 2. `src/components/accounting/GLExportModal.tsx`
- Reset options to defaults when modal opens (use `useEffect` on `open`)
- Add better error handling: log line items count before export
- Fix potential FK join issue: use explicit select with `chart_of_accounts!account_id(...)` if needed
- When CSV is selected and user clicks Export, also respect "include line items" option — currently CSV only exports journal entries header-level data

### 3. CSV with Line Items support
- When CSV format is selected and "Include Line Items" is checked, export a flat CSV with one row per line item (entry info repeated per line)
- When unchecked, export journal entry level only (current behavior)

## Files to modify
- `src/components/accounting/GLExcelExporter.ts` — remove lineItems.length guard, add empty-state row
- `src/components/accounting/GLExportModal.tsx` — reset state on open, improve error handling, enable CSV section toggles

