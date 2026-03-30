

# Fix Invoice: Bus Type, Mileage from Quotation + Page 2 Signature Layout

## Problems Found

1. **Bus Type hardcoded as "Standard Bus"** -- All 8 places that build `InvoiceData` use `busType: 'Standard Bus'` instead of fetching from the `bus_types` table via `bus_type_id`
2. **Mileage showing wrong value (100)** -- The mileage calculation `data.actualKmTraveled || data.tripDistance || data.totalKm || (numberOfBuses * 100)` falls through to the fallback because `tripDistance` and `totalKm` are computed using wrong column names (`km_parking` / `km_return` which don't exist -- actual columns are `km_parking_to_pickup` / `km_drop_to_parking`)
3. **Signature section splits across pages** -- The CSS `page-break-before: always` on `.page-break` div doesn't work in html2canvas (it renders everything as one continuous image). The signature block bleeds between pages instead of cleanly starting on page 2

## DB Reality
- Quotation QUO-2026-1724 has: `bus_type_name = 'Super Luxury - A/C (49 Seats)'`, `km_trip = 529.3`, `km_parking_to_pickup = 131.4`, `km_drop_to_parking = 407.2`
- But invoice shows: `Bus Type = Standard Bus`, `Mileage = 100`

## Changes

### File 1: `src/lib/invoice-generator.ts`

**Mileage calculation (line 223)**: Priority should be:
1. `actualKmTraveled` (post-trip adjustment)
2. `tripDistance` (quotation km_trip)
3. `totalKm` (sum of all legs)
4. Remove the `numberOfBuses * 100` fallback -- show 0 if nothing available

**Page layout (lines 225-473)**: Split into two explicit `[data-pdf-page]` containers instead of relying on CSS page-break:
- Page 1: Header + invoice details + item table + summary + payment info + T&C + "Page 1 of 2" footer
- Page 2: Company mini-header + signature table + note + "Page 2 of 2" footer

**PDF generation (lines 500-590)**: Update to render each `[data-pdf-page]` as a separate canvas/page (same pattern used in quotation PDF generation), instead of one big image split by height.

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`

**Line 849**: Replace `busType: 'Standard Bus'` with actual bus type name from quotation. Need to join `bus_types` table in the query or pass `bus_type_name` through.

**Line 860-861**: Fix column names -- use `km_parking_to_pickup` and `km_drop_to_parking` instead of non-existent `km_parking` and `km_return`.

### Files 3-6: All other places with hardcoded `busType: 'Standard Bus'`

Update these files to resolve bus type from quotation's `bus_type_id`:
- `src/hooks/useDocumentRegeneration.ts` (line 144)
- `src/hooks/useDocumentManagement.ts` (lines 244, 387)
- `src/hooks/useFinanceApproval.ts` (lines 369, 443, 582)
- `src/components/special-hire/DocumentViewer.tsx` (line 399)
- `src/components/special-hire/EnhancedDocumentViewer.tsx` (line 257)

Each of these already queries quotation data -- add a join to `bus_types` to get the name, or add `bus_type_id` and resolve separately.

### Mileage Logic (all files)

Replace all instances of `totalKm: (quotation as any).km_parking + (quotation as any).km_trip + (quotation as any).km_return` with the correct column names: `km_parking_to_pickup + km_trip + km_drop_to_parking`.

## Summary

- Bus type: resolve from `bus_types.name` via `bus_type_id` join instead of hardcoding "Standard Bus"
- Mileage: fix column names (`km_parking_to_pickup`, `km_drop_to_parking`) and remove bad fallback
- Signature page: use `[data-pdf-page]` multi-page rendering so signatures appear cleanly on page 2

