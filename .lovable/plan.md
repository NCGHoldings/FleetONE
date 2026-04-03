

# Add GL Export Modal to Journal Entries View

## What to build
An export button on the General Ledger (Journal Entries) page that opens a modal allowing users to customize and download their filtered journal entries as Excel, CSV, or PDF. The export respects all active filters (search, date range, status, business unit, amount range).

## How it works

### Export Modal
- Format selector: Excel (.xlsx), CSV, PDF
- Section toggles (checkboxes):
  - **Summary**: Total entries, total debit/credit, date range, business unit breakdown
  - **Journal Entries**: The filtered entry list with entry #, date, business unit, description, debit, credit, status
  - **Include Line Items**: Expand each JE to show individual debit/credit lines with GL account codes and names (requires fetching `journal_entry_lines` for selected entries)
  - **Source Module Breakdown**: Group totals by source_module
- "Export" button triggers download with filename like `GL_Journal_Entries_2026-04-03.xlsx`

### Excel Format (primary)
- **Summary sheet**: Report metadata, filter criteria applied, totals
- **Journal Entries sheet**: Filtered entries table with styled headers (reuse existing `headerStyle`/`cellStyle` pattern from SinotrukExcelExporter)
- **Line Items sheet** (optional): All JE lines with account_code, account_name, debit, credit, description
- **By Business Unit sheet** (optional): Subtotals grouped by business unit
- **By Source Module sheet** (optional): Subtotals grouped by source_module

### CSV Format
- Flat export of the filtered entries table

### Data Flow
- Export uses the already-filtered `filteredEntries` array from the view (no re-fetching)
- If "Include Line Items" is checked, fetch `journal_entry_lines` for all filtered entry IDs in a single batch query before generating the file

## Files to create/modify

### Create: `src/components/accounting/GLExportModal.tsx`
- Modal UI with format selector and section checkboxes
- Handles export logic for Excel/CSV formats
- Accepts `filteredEntries` and `filters` as props

### Create: `src/components/accounting/GLExcelExporter.ts`
- `exportGLReport(entries, lines, filters, options)` function
- Multi-sheet workbook using `xlsx-js-style` (same pattern as SinotrukExcelExporter)

### Modify: `src/components/accounting/JournalEntriesView.tsx`
- Add "Export" button next to "New Entry" button
- Add state for export modal open/close
- Render `<GLExportModal>` with filtered data and current filter state

