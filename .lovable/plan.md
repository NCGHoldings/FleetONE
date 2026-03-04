

# Add Row CRUD Operations to Yutong Live Spreadsheet

## Problem
The spreadsheet currently only supports inline cell editing. It lacks the ability to **add new order rows**, **edit full order details**, or **delete orders** directly from the spreadsheet view.

## Solution
Add Add/Edit/Delete row functionality to both the internal and public spreadsheet views.

## Changes

### 1. `YutongSpreadsheetCore.tsx` — Add row action buttons & dialogs
- Add **"+ Add Order"** button to the toolbar
- Add an **actions column** (last column) with Edit and Delete icon buttons per row
- Add a **New/Edit Order dialog** with fields: customer name, company, bus model, quantity, total amount, payment mode, expected delivery, notes
- Add a **Delete confirmation dialog** (AlertDialog)
- New props: `onAddOrder`, `onDeleteOrder` callbacks (optional — only shown when provided)

### 2. `useYutongSpreadsheetData.ts` — Add create & delete mutations
- Add `addOrder(data)`: inserts into `yutong_orders` (requires a quotation_id or direct insert with manual fields)
- Add `deleteOrder(orderId)`: deletes from `yutong_orders` by id
- Both trigger refetch after completion

### 3. `YutongOrderSpreadsheet.tsx` — Wire up new callbacks
- Pass `addOrder` and `deleteOrder` from the hook to `YutongSpreadsheetCore`

### 4. `supabase/functions/yutong-spreadsheet-data/index.ts` — Support delete action for public view
- Add `action === 'delete'` handler that deletes an order by id
- Add `action === 'add'` handler that inserts a new order row with provided fields

### 5. `PublicYutongSpreadsheet.tsx` — Wire up add/delete for public view
- Add `handleAdd` and `handleDelete` that call the edge function with the appropriate action

### 6. Migration — Add NOTIFY for schema cache
- Include `NOTIFY pgrst, 'reload schema'` to ensure the `vehicle_year` column from the previous migration is recognized by PostgREST

## Key Details

**Add Order Dialog fields:**
- Customer Name, Company Name, Bus Model, Quantity, Unit Price/Total Amount, Payment Mode, Expected Delivery Date, Notes
- Inserts directly into `yutong_orders` (without requiring a quotation)

**Delete:** Soft confirmation via AlertDialog, then hard delete from `yutong_orders`.

**Actions column:** Small icon buttons (Pencil, Trash2) in the last column of each row.

## Files to Modify
1. `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx`
2. `src/hooks/useYutongSpreadsheetData.ts`
3. `src/components/yutong/spreadsheet/YutongOrderSpreadsheet.tsx`
4. `supabase/functions/yutong-spreadsheet-data/index.ts`
5. `src/pages/PublicYutongSpreadsheet.tsx`

## Files to Create
1. Migration file for `NOTIFY pgrst, 'reload schema'`

