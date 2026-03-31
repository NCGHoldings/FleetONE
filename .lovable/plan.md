

# Fix: Excel Upload Reads Data But Inserts 0 Vehicle Records

## Root Cause

**Line 117** in all 3 upload components strips empty-name columns from the headers array:
```js
const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim()).filter(h => h);
```

But data rows (`allData`) keep ALL columns including the empty-header ones. This causes a **column index mismatch**:

```text
Excel columns:    [A, B, "", D, E, "", G]  (7 columns)
Filtered headers: [A, B, D, E, G]          (5 items)
Data row:         [1, 2, x, 4, 5, y, 7]    (7 items)

headers[2] = "D" → but row[2] = "x" (the empty column's data, not D's data)
```

This misalignment causes `isSectionHeaderRow()` to read wrong column values for engine_no, chassis_no, model — they all appear empty — so **every row is flagged as a section header** and filtered out. Result: 0 records inserted.

## Fix (3 files, same change)

**Replace the header filtering** to preserve original column indices by keeping empty headers in the array (mark them but don't remove them):

### File 1: `src/components/yutong/YutongVehicleDataUpload.tsx` (line 117)
### File 2: `src/components/sinotruck/SinotrukVehicleDataUpload.tsx` (line 118)
### File 3: `src/components/lightvehicle/LightVehicleVehicleDataUpload.tsx` (line 118)

Change:
```js
const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim()).filter(h => h);
```
To:
```js
const fileHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
```

This keeps empty column names in the array, preserving 1:1 alignment between `headers[idx]` and `row[idx]`.

Then update the auto-detect mapping call to skip empty headers naturally (they won't match any pattern, so `mappedTo` will be null — which already works correctly).

Additionally, update the UI rendering of column mappings to skip displaying empty-name columns so the mapping step stays clean.

### UI filter for mapping display

In each file's mapping step JSX, filter the display:
```js
columnMappings.filter((m, i) => headers[i]).map(...)
```
becomes the display filter, while the full array stays intact for data alignment.

## Affected Components
- `YutongVehicleDataUpload.tsx`
- `SinotrukVehicleDataUpload.tsx`
- `LightVehicleVehicleDataUpload.tsx`

## Expected Result
After fix: uploading any Excel file with empty columns will correctly align data, section header detection will work properly, and all valid vehicle rows will be inserted into the database.

