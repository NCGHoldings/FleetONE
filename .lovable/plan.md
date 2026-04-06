

# Fix: School Student Excel Import Crash

## Problem
When importing a student Excel file, the parser crashes with `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`. This happens because the Excel file has empty/blank header cells — `XLSX.utils.sheet_to_json` with `{ header: 1 }` returns `undefined` for empty cells in the header row. When `autoMapColumns` iterates over these headers and calls `header.toLowerCase()`, it crashes.

## Solution
Filter out `undefined`/empty header values before processing:

### Modify: `src/components/school/SchoolExcelImport.tsx`

**Line 112** — Filter headers to only include defined, non-empty string values:
```typescript
const rawHeaders = jsonData[0] as any[];
const headers = rawHeaders.map((h, i) => (h != null ? String(h).trim() : '')).filter(h => h !== '');
```

**Line 118** — Guard against undefined headers in row-to-object mapping (use rawHeaders length to preserve column index alignment):
```typescript
const rawHeaders = jsonData[0] as any[];
// ...
setExcelData(rows.map(row => {
  const obj: any = {};
  headers.forEach((header, index) => {
    if (header) {
      obj[header] = row[rawHeaders.indexOf(header) >= 0 ? rawHeaders.indexOf(header) : index];
    }
  });
  return obj;
}));
```

**Line 169-170** — Add safety guard in `autoMapColumns`:
```typescript
const matchingHeader = headers.find(header => {
  if (!header) return false;
  const h = header.toLowerCase().replace(/\s+/g, ' ').trim();
```

This ensures:
- Empty header columns are safely skipped
- Column index alignment is preserved for data rows
- The auto-mapping logic never crashes on undefined values

## Files
- **Modify**: `src/components/school/SchoolExcelImport.tsx` — filter empty headers + add null guards

