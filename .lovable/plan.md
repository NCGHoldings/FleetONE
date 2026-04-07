

# Fix: Special Hire Payment Reminder & Invoice Document Improvements

## Issues Found (from the screenshot)

| Issue | Current | Should Be |
|---|---|---|
| **Mileage** | Shows `0` | Should show quotation distance (km_trip), or actual KM if post-trip adjustment exists |
| **Invoice Number** | `REM-QUO-2026-1763-v1.0` (hardcoded prefix + quotation no) | Should use the centralized numbering system or the actual invoice number if one exists |
| **Intermediate Stops** | Not shown | Should display `intermediate_stops` (jsonb) between pickup and drop locations |
| **Vehicle/Driver/Conductor** | Has hardcoded fallbacks like `NE 2157`, `Tharindu`, `Kalpa` | Should show actual assigned values or leave blank |
| **Amount** | Only shows quotation amount | Should include post-trip adjustment amount when finalized |

## Plan

### 1. Fix Payment Reminder Data Assembly (ConfirmedTripsTable.tsx)

In the "Send Payment Reminder" `onClick` handler (~line 1489):

- **Mileage**: Add `tripDistance` from quotation's `km_trip` field and `totalKm` from `calculateTotalKm(trip)`. If trip has finalized adjustment, fetch `actual_km_traveled` from `special_hire_trip_adjustments`.
- **Invoice Number**: Instead of `REM-${trip.quotation_no}`, check if an existing invoice exists in `trip.invoices` (balance type). If yes, use that `invoice_no`. If not, generate via `generate_entity_number` RPC with entity type `special_hire_payment_reminder`, or use a clean format like `PR-YYYY-NNNNN`.
- **Intermediate Stops**: Pass `trip.intermediate_stops` to the invoice data as a new `intermediateStops` field.
- **Post-trip adjustment**: Fetch from `special_hire_trip_adjustments` for the quotation and pass `hasAdjustments`, `extraKm`, `extraKmChargePerKm`, `extraKmTotalCharge`, `additionalExpenses`, `totalAdditionalExpenses`, `adjustmentNotes` to the reminder data. The `totalAmount` should already include `adjustment_amount` from `calculateTotalAmount`.

### 2. Fix Invoice Generator Template (invoice-generator.ts)

- **Remove hardcoded fallbacks**: Line 296-297 has `'NE 2157'`, `'(D) Tharindu'`, `'(A) Kalpa'` as defaults. Replace with empty/blank when no data is assigned.
- **Add `intermediateStops` to InvoiceData interface**: New optional field `intermediateStops?: Array<{ location: string }>`.
- **Show route with stops**: In the Item Detail cell, render: `pickup → stop1 → stop2 → drop` instead of just `pickup to drop`.
- **Add conductor display**: Show conductor name in the Remark row alongside driver if available.
- **Mileage**: Already uses `tripDistance || totalKm || actualKmTraveled || 0` — just need to pass the data correctly.

### 3. Fix Invoice Number for Payment Reminders

- Use `generate_entity_number` RPC with a new entity type `sph_payment_reminder` (prefix: `PR`, with year).
- Register this entity type in the numbering settings seed or use a fallback format `PR-YYYY-NNNNN`.
- For actual invoices (not reminders), keep using the existing `INV-{quotation_no}-BAL` format.

## Technical Details

- The `intermediate_stops` column is JSONB with structure: `[{"id":"...", "location":"Place Name", "lat":..., "lng":...}]`
- The `special_hire_trip_adjustments` table has all post-trip data needed (extra KM, additional expenses, adjustment amount)
- The `QuotationWithPayments` interface already includes `adjustment_amount` and `has_finalized_adjustment`

## Files
- **Modify**: `src/lib/invoice-generator.ts` — add `intermediateStops` to `InvoiceData`, remove hardcoded fallbacks, show stops in route
- **Modify**: `src/components/special-hire/ConfirmedTripsTable.tsx` — fix payment reminder data assembly (mileage, invoice number, stops, adjustments)

## Result
- Mileage shows actual distance from quotation or post-trip data
- Invoice number uses proper sequential numbering
- Route shows all intermediate stops
- Vehicle/driver/conductor show real assigned values (no fake defaults)
- Amounts correctly include post-trip adjustments when applicable

