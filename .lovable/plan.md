

# Special Hire Spreadsheet — Full Operations Tracking View

## What You Want
A single, wide spreadsheet (like the Yutong Orders Spreadsheet) for Special Hire that consolidates all hire data — from quotation through trip operations to financials — in one editable grid with inline editing, search, KPIs, and Excel export.

## Column Mapping (Your Columns → Database Fields)

The spreadsheet will be organized into **color-coded column groups** for readability, with horizontal scroll and frozen first columns:

| Group | Columns | Source |
|---|---|---|
| **Hire Info** (blue) | #, No of Hires (quotation_no), Cancelled/Completed (status), Company Name, Customer Name, Contact Number, Route (pickup→drop), Type of Bus, No of Bus, Mileage (km_trip), Quotation Amount (gross_revenue), Completed Hires Amount (total_paid), Date (pickup_datetime), Addi. Cus Requests (special_request), Number of Days | `special_hire_quotations` + `bus_types` |
| **Operations** (green) | Number of Buses Deployed, Bus Number (assigned_bus_no), Driver (assigned_driver_name), Assistant (assigned_conductor_name), From (pickup_location), To (drop_location), Pick up Time, Drop off Time, Remark (Operation) | `special_hire_quotations` |
| **Invoice** (light blue) | Invoice Number, Invoiced Kilo Meters (actual_km from adjustments), Invoice Amount, Discount, Price After Discount | `special_hire_invoices` + `special_hire_trip_adjustments` |
| **Meter/KM** (white) | Check In Meter, Check Out Meter, Actual Kilo Meters, Charges for Additional Distance, Charges for Additional Hours | `special_hire_trip_adjustments` |
| **Expenses** (orange) | Fuel Cost (Actual), Driver Wages, Assistance Wages, Driver Meal Allowance, Assistance Meal Allowance, Wages, Maintenance, Other (Permit, Highway) | Editable — new `special_hire_trip_expenses` table or inline JSON on quotation |
| **Summary** (yellow) | Net Income, Per Day Total Buses, Advance Payment, Advanced Payment Date, Balance Payment, Date, Remark | Computed + `special_hire_payments` |

## Implementation Plan

### 1. New Hook: `src/hooks/useSpecialHireSpreadsheetData.ts`
- Fetch confirmed quotations with joins to `bus_types`, `special_hire_payments`, `special_hire_invoices`, `special_hire_trip_adjustments`
- Map to a flat `SpreadsheetHire` interface with all ~45 columns
- Provide `updateField()` for inline edits (updates `special_hire_quotations` or related tables)
- Realtime subscription on `special_hire_quotations` for live updates
- Since expense fields (fuel cost actual, wages, meal allowances, maintenance, etc.) don't exist in the DB yet, store them as a JSON column `trip_expenses` on `special_hire_quotations` (avoids needing a new table — same pattern as `other_expenses` already on the table)

### 2. New Component: `src/components/special-hire/spreadsheet/SpecialHireSpreadsheetCore.tsx`
- Follow exact same pattern as `YutongSpreadsheetCore.tsx`
- Color-coded column group headers (blue/green/light-blue/orange/yellow) matching the user's Excel screenshots
- Inline click-to-edit cells for editable fields
- Dropdown selects for status fields
- Frozen first 2-3 columns (row #, quotation no) for horizontal scrolling
- KPI cards: Total Hires, Total Revenue, Total Collected, Net Income
- Search, Refresh, Export Excel toolbar

### 3. Wrapper: `src/components/special-hire/spreadsheet/SpecialHireSpreadsheet.tsx`
- Simple wrapper like `YutongOrderSpreadsheet` with header + share capability

### 4. Add "Spreadsheet" Tab to `src/pages/SpecialHire.tsx`
- New tab trigger with `Table2` icon labeled "Sheet"
- TabsContent rendering `<SpecialHireSpreadsheet />`

### User-Friendly Design Decisions
- **Column group color bands** in the header row matching the Excel screenshots (blue for hire info, green for operations, orange for expenses, yellow for financial summary)
- **Sticky left columns** so quotation # stays visible while scrolling right through 40+ columns
- **Smart defaults**: empty expense fields show "0" and are click-to-edit
- **Auto-computed fields**: Net Income = Invoice Amount - total expenses; Balance = Quotation Amount - Total Paid
- **Collapsible column groups**: ability to hide/show entire groups (e.g., hide Expenses group when just reviewing operations)

### Files to Create/Edit

| File | Action |
|---|---|
| `src/hooks/useSpecialHireSpreadsheetData.ts` | Create — data hook |
| `src/components/special-hire/spreadsheet/SpecialHireSpreadsheetCore.tsx` | Create — main grid |
| `src/components/special-hire/spreadsheet/SpecialHireSpreadsheet.tsx` | Create — wrapper |
| `src/pages/SpecialHire.tsx` | Edit — add Spreadsheet tab |

### DB Note
The expense fields (fuel cost actual, driver wages, assistance wages, meal allowances, maintenance, other permits/highway) will be stored in the existing `other_expenses` JSONB column on `special_hire_quotations`, extended with new keys. No new tables needed.

