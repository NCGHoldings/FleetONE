

# Add Validity Period to All Quotation T&C and Previews

## Problem
None of the three quotation previews (Yutong, Sinotruck, Light Vehicle) show a **quotation validity period** in their Terms & Conditions section. The `valid_until` / `valid_days` / `validity_period` data exists in the database and forms, but is never rendered in the T&C on the document preview/PDF.

## What Changes

### 1. Yutong Preview — `YutongQuotationPreview.tsx`
- Add a new **clause 11** to the T&C: *"Quotation Validity: This quotation is valid for {valid_days} days from the date of issue (valid until {valid_until}). After this period, prices and availability are subject to change."*
- Uses existing `quotation.valid_until` (already in the interface) and computes days from `created_at`

### 2. Light Vehicle Preview — `LightVehicleQuotationPreview.tsx`
- Add a new **clause 12** to the T&C: *"Quotation Validity: This quotation is valid for {validity_period} from the date of issue. After this period, prices and availability are subject to change."*
- Uses existing `quotation.validity_period` (already passed as prop)

### 3. Sinotruck Preview — `SinotruckQuotationPreview.tsx`
- Add a validity clause to the T&C section (or add one if none exists)
- Uses existing `quotation.valid_until` to display: *"This quotation is valid until {formatted valid_until date}."*
- The Sinotruck form already has `DEFAULT_TERMS_AND_CONDITIONS[0]` with "valid for 30 days" but this is a generic array — I'll ensure it dynamically uses the actual `valid_until` date

### 4. All Three Previews — Add Validity Banner
- Add a prominent styled box near the top of Page 1 (below quotation details) or at the start of T&C showing: **"This quotation is valid until: [date]"** so it's clearly visible

## Files to Modify
1. `src/components/yutong/YutongQuotationPreview.tsx` — add clause 11 + validity display
2. `src/components/lightvehicle/LightVehicleQuotationPreview.tsx` — add clause 12 + validity display
3. `src/components/sinotruck/SinotruckQuotationPreview.tsx` — add dynamic validity clause

