

# Vehicle Year Field — Already Added, Needs Preview Refresh

## Status: Code Is Complete and Correct

I verified the file `src/components/yutong/YutongEditQuotationModal.tsx` — the Vehicle Year field is fully implemented:

1. **Schema** (line 32): `vehicle_year: z.number().min(2000).max(2100)`
2. **Interface** (line 82): `vehicle_year?: number`
3. **Form initialization** (line 183): loads from existing quotation data
4. **UI field** (lines 814-830): "Vehicle Year" number input, positioned right before Quantity/Unit Price/Discount in a 4-column grid
5. **Save logic** (line 344): persists to database when creating new version

## What to Do

The form in your screenshot shows the old layout (3 columns: Quantity, Unit Price, Discount). The updated code has 4 columns (Year, Quantity, Unit Price, Discount).

**Just scroll down slightly** in the edit form — the Vehicle Year field is right below "Bus Model" and above "Quantity". If the preview is still showing the old version, wait for it to finish building and refresh the page.

If you're viewing this on the **published site** (ncg-fleetone.lovable.app), you need to click **Publish** to deploy the latest code.

## No Code Changes Required

