

# Add Vehicle Year Field to Yutong Quotation Edit Modal

## Problem
The Yutong quotation has a `vehicle_year` field (stored in the database and shown in the quotation preview as "YEAR : 2026"), but the **Edit Quotation** modal doesn't include this field. So when you edit a quotation (staff edit or customer request), the year cannot be changed — and worse, the new version loses the year entirely because it's not carried over.

## Fix

### File: `src/components/yutong/YutongEditQuotationModal.tsx`

1. **Add `vehicle_year` to the Zod schema** (line ~32):
   ```
   vehicle_year: z.number().min(2000).max(2100).default(new Date().getFullYear())
   ```

2. **Add `vehicle_year` to the interface** (line ~48): add `vehicle_year?: number` to `YutongQuotation`

3. **Set default value** in form defaults and in the `useEffect` reset (line ~167):
   ```
   vehicle_year: (quotation as any).vehicle_year || new Date().getFullYear()
   ```

4. **Add Year input field in the form UI** — in the "Pricing & Details" section, add a number input for Year alongside Quantity/Unit Price

5. **Pass `vehicle_year` when creating the new version** (line ~340 in `handleFormSubmit`):
   ```
   vehicle_year: data.vehicle_year || new Date().getFullYear()
   ```

## Result
- Users can change the manufactured year when editing a quotation
- The year carries over correctly to new versions
- Shows in the quotation preview as "YEAR : 2026" (or whatever year is set)

