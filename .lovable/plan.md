

# Enhanced Vehicle Data Upload with Auto-Shipment Creation

## Problem
The current upload flow requires a shipment to exist before linking vehicle data to it. The user needs to upload a new Excel sheet as "Shipment 7" (continuing from 6 existing shipments), but there's no way to create a shipment inline during upload. Also, the Excel has columns (ORDER NO, ITEM NO, VIN NO) that aren't in the current mapping options.

## Changes

### 1. Add missing column mapping options — `YutongVehicleDataUpload.tsx`
Add new field options to `FIELD_OPTIONS`:
- `item_no` → maps to `vehicle_no` in DB (ITEM NO like 25E371X-0025)
- `vin_no` → maps to `chassis_no` in DB (VIN NO like LZYTDT...)
- `order_no` → stored in `raw_data` (reference only, like 454104)

Update `COLUMN_PATTERNS` in the hook to auto-detect these new columns:
- `item_no`: patterns `['item', 'item no', 'item number']`
- `vin_no`: patterns `['vin', 'vin no', 'vin number']`
- `order_no`: patterns `['order', 'order no', 'order number']`

### 2. Add "Create New Shipment" option inline — `YutongVehicleDataUpload.tsx`
In the shipment selector dropdown, add a "**+ Create New Shipment**" option at the top. When selected, show inline fields:
- Shipment Name (text input, pre-filled from sheet name)
- Expected dates (optional)

On import, if "create new" is selected, auto-create the shipment group first via `useYutongShipmentGroupManagement.createShipmentGroup()`, then link the data sheet and vehicles to it.

### 3. Improve data preview — `YutongVehicleDataUpload.tsx`
- Show all rows count with a summary by model type (parsed from the data)
- Highlight section header rows (like "C9 Customers and Exstock...") in the preview and skip them during import (rows where most mapped fields are empty)
- Show a badge with the shipment it will be linked to

### 4. Filter out section header rows during import — `YutongVehicleDataUpload.tsx`
The Excel has group separator rows (e.g., "C9 Customers and Exstock - 37+1+1 = 9"). During import, skip rows where the engine_no/chassis_no/vin_no columns are empty AND the first column contains text that doesn't look like a number — these are section headers, not vehicle data.

### 5. Hook updates — `useYutongVehicleDataManagement.ts`
- Add `item_no` and `vin_no` to `COLUMN_PATTERNS` for auto-detection
- In `insertVehicleRecords`, handle `item_no` → `vehicle_no` and `vin_no` → `chassis_no` field mapping

### Files to Edit
- `src/components/yutong/YutongVehicleDataUpload.tsx` — inline shipment creation, new field options, header row filtering, better preview
- `src/hooks/useYutongVehicleDataManagement.ts` — new column patterns for auto-detection

