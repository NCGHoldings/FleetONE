

# Add Editable "Year" Field to Yutong Quotation Form

## Problem
Currently, the **YEAR** shown on the quotation PDF/preview is pulled from the bus model's `manufactured_year` field. But sometimes you need to sell 2025 or 2024 stock, not just the current year. The year should be set per-quotation, not per-bus-model.

## Solution
Add a `vehicle_year` column to `yutong_quotations` table, add a Year input field to the quotation creation form (defaulting to current year 2026), and update the preview to use this quotation-level year instead of the bus model's year.

## Changes

### 1. Database Migration
- Add `vehicle_year INTEGER DEFAULT 2026` to `yutong_quotations`

### 2. Quotation Form (`YutongQuotationFormUpdated.tsx`)
- Add `vehicle_year` to the Zod schema (number, default current year)
- Add a Year input field in the "Product Details" section near the bus model selector
- Include `vehicle_year` in the insert payload
- Default to `new Date().getFullYear()` (auto-suggests current year)
- User can change to 2025, 2024, etc.

### 3. Quotation Preview (`YutongQuotationPreview.tsx`)
- Change year resolution: use `quotation.vehicle_year` first, then fall back to `busModelDetails.manufactured_year`, then "N/A"

### 4. Types Update (`types.ts`)
- Add `vehicle_year` to the `yutong_quotations` type

### Files
- **Create**: 1 migration file
- **Modify**: `YutongQuotationFormUpdated.tsx`, `YutongQuotationPreview.tsx`, `types.ts`

