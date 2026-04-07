

# Fix: "Iterator value undefined is not an entry object" Parse Error

## Root Cause

Line 214 in `FleetVehicleDataImport.tsx`:
```js
raw: Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
```

When XLSX parses a sparse Excel row (e.g., trailing empty columns), the `row` array can have **holes** (empty slots). The `headers.map()` produces entries like `[headerName, undefined]` which is fine, but if the Excel row itself is shorter than the headers array, `row[idx]` is just undefined — that's not the issue.

The real problem: `rawData[headerRowIdx]` from XLSX can be a **sparse array**. When `.map()` runs on a sparse array, empty slots produce `undefined` entries in the result. `Object.fromEntries()` then throws because it receives `undefined` instead of a `[key, value]` pair.

## Fix

Two changes in the `onDrop` callback:

1. **Line 152** — Convert sparse header array to dense:
   ```js
   const headers = Array.from(rawData[headerRowIdx] as any[]).map(h => String(h || "").trim());
   ```

2. **Line 214** — Guard against sparse data rows:
   ```js
   raw: Object.fromEntries(headers.map((h, idx) => [h || `col_${idx}`, row?.[idx] ?? null])),
   ```

3. **Line 209** — Fix the no-op filter condition `!isNaN(v as any) !== false` (always true). Replace with:
   ```js
   .filter(([k, v]) => k !== "bus_no" && v != null && String(v).trim() !== "")
   ```

## Files
- **Modify**: `src/components/fleet/FleetVehicleDataImport.tsx` — 3 line fixes

