

# Fix: Yutong Proforma Invoice Without Engine/Chassis + Vehicle Data Linking

## Problems Identified

### 1. Proforma Invoice Requires Engine Number and Chassis Number
Currently, when clicking "Proforma Invoice" from the Generate Invoice dropdown, the system requires all vehicle details (engine number, chassis number, etc.) to be complete before allowing any invoice generation (line 160-164 in `YutongOrderInvoiceGenerator.tsx`). However, at the proforma stage, these details are often not yet available -- the bus hasn't arrived yet.

### 2. Vehicle Matching Modal Shows "Failed to load orders"
The `YutongVehicleMatchingModal.tsx` queries `yutong_quotations(customer_name, model_name)` but the `yutong_quotations` table has NO `model_name` column -- the correct column is `bus_model`. This causes the entire query to fail with a Supabase error, showing "No matching orders found" and "Failed to load orders".

### 3. No Integration Between Vehicle Data Page and Order Invoice Flow
When a vehicle is matched to an order via the Vehicle Data page, the engine number, chassis number, and other details from the vehicle record are not automatically populated into the order's vehicle details. Users have to manually re-enter them.

## Solution

### File 1: `src/components/yutong/YutongOrderInvoiceGenerator.tsx`

**Allow Proforma Invoice without engine/chassis details:**

- Modify `handleGenerateInvoice` (line 155-176): When the invoice type is `proforma_invoice`, skip the `vehicleDetailsComplete` check. Only require vehicle details for `direct_invoice` and `tax_invoice`.
- Update the UI (line 361-398): Show the "Generate Invoice" dropdown even when vehicle details are incomplete, but only include "Proforma Invoice" as an option. The "Customer Invoice" and "Tax Invoice" options remain disabled/hidden until vehicle details are complete.
- Update the invoice data preparation (line 206-251): For proforma invoices, use fallback values like "TBA" for engine_number and chassis_number when they are not yet available.

### File 2: `src/components/yutong/YutongVehicleMatchingModal.tsx`

**Fix the broken query:**

- Line 53: Change `model_name` to `bus_model` in the Supabase select query:
  ```
  quotation:yutong_quotations(customer_name, bus_model)
  ```
- Line 65, 88: Update all references from `order.quotation?.model_name` to `order.quotation?.bus_model`

### File 3: `src/components/yutong/YutongVehicleMatchingModal.tsx` (continued)

**After matching, auto-populate vehicle details to the order:**

- Extend the `handleMatch` function: After `matchVehicleToOrder` succeeds, also update the `yutong_orders` table with the vehicle record's engine_no, chassis_no, year_of_manufacture, country_of_origin, fuel_type, engine_capacity, and color fields.

### File 4: `src/components/yutong/YutongInvoiceDataModal.tsx`

**Make engine/chassis optional for proforma context:**

- Add an optional `isProforma` prop to the component
- When `isProforma` is true, remove the `required` attribute from engine_number and chassis_number fields
- Update the validation on line 66: Only require engine_number and chassis_number when `isProforma` is false

### File 5: `src/hooks/useYutongVehicleDataManagement.ts`

**Enhance `matchVehicleToOrder` to sync vehicle details to the order:**

- After updating the vehicle record's match status, also update the corresponding `yutong_orders` row with:
  - `engine_number` from vehicle's `engine_no`
  - `chassis_number` from vehicle's `chassis_no`
  - `year_of_manufacture` from vehicle record
  - `country_of_origin` from vehicle record
  - `fuel_type` from vehicle record
  - `engine_capacity` from vehicle record
  - `color_scheme` from vehicle's `color`

This creates a seamless flow: Upload vehicle data -> Match to order -> Vehicle details auto-populate -> All invoice types become available.

## Technical Summary

| Change | File | Impact |
|--------|------|--------|
| Skip vehicle check for proforma | YutongOrderInvoiceGenerator.tsx | Proforma invoices work without engine/chassis |
| Fix `model_name` to `bus_model` | YutongVehicleMatchingModal.tsx | Vehicle matching modal loads orders correctly |
| Auto-sync vehicle data to order | useYutongVehicleDataManagement.ts | Matching a vehicle auto-fills order details |
| Optional engine/chassis fields | YutongInvoiceDataModal.tsx | Modal adapts based on invoice context |
| Show proforma option always | YutongOrderInvoiceGenerator.tsx | Users can generate proforma even with incomplete vehicle data |

## Expected User Flow

```text
1. Create Order (no vehicle details yet)
2. Click "Generate Invoice" -> choose "Proforma Invoice"
   -> Works immediately with "TBA" for engine/chassis
3. Later, go to Vehicle Data page -> upload data sheet
4. Match vehicle record to order
   -> Engine, chassis, etc. auto-populate into the order
5. Now "Customer Invoice" and "Tax Invoice" become available
   -> Full details appear on the invoice
```

