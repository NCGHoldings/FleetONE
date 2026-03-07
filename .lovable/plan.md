

# Make Special Hire Spreadsheet Fully Interactive

## Current State
The spreadsheet renders data but most cells are **read-only**. Only Operations assignments, Expenses, and Remarks are editable. The `renderDropdownCell` function exists but is never used. Status shows as a static badge.

## Changes Needed

### `SpecialHireSpreadsheetCore.tsx` — Make all relevant cells editable

**Dropdowns** (using existing `renderDropdownCell`):
- **Status** (line 344-348): Replace static badge with dropdown (`STATUS_OPTIONS`)
- **Trip Status**: Add as a visible column or merge with status

**Inline editable text/number fields** — convert from static `<td>` to `renderEditableCell()`:
- **Hire Info**: Company Name, Customer Name, Phone, Special Request, KM Trip
- **Operations**: Pickup Location, Drop Location (currently static), Pickup Time, Drop Time
- **Invoice**: Invoice Number, Invoiced KM, Invoice Amount, Discount
- **Meter/KM**: Check In Meter, Check Out Meter, Actual KM, Distance Charge, Hours Charge

**Auto-recalculate on edit**:
- `actual_km` = check_out_meter - check_in_meter (auto-compute)
- `price_after_discount` = invoice_amount - discount (auto-compute)
- `net_income` recalculates when expenses change

### `useSpecialHireSpreadsheetData.ts` — Expand `updateField` to handle more fields

Add these to `quotationDirectFields`:
- `customer_name`, `customer_phone`, `company_name`, `special_request`, `km_trip`, `pickup_location`, `drop_location`, `discount_amount_lkr`

Add new update paths for:
- **Invoice fields** → update `special_hire_invoices` table
- **Meter/KM fields** → update `special_hire_trip_adjustments` table (upsert if not exists)

### Files to Edit

| File | Changes |
|---|---|
| `src/components/special-hire/spreadsheet/SpecialHireSpreadsheetCore.tsx` | Replace static cells with `renderEditableCell`/`renderDropdownCell`, add auto-compute logic |
| `src/hooks/useSpecialHireSpreadsheetData.ts` | Expand `updateField` to handle invoice, meter/km, and more quotation fields |

