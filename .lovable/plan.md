

# Fix: Special Hire Invoice — Mileage shows quoted-only, Extra KM (quotation-time + post-trip) not reflected

## What's broken (verified in code)

### Bug 1: Invoice "Mileage" line always shows the quoted KM, never the actual KM traveled
File: `src/lib/invoice-generator.ts` (lines 305-307, 480-482)

```ts
const mileage = (data.hasAdjustments && data.actualKmTraveled)
  ? data.actualKmTraveled
  : (data.tripDistance || data.totalKm || 0);
```

The fallback uses `data.tripDistance || data.totalKm || 0`. But:
- `TripDetailsModal.tsx` (lines 301–325) builds `quotationData` for `GenerateBalanceInvoiceModal` and **never passes** `tripDistance` or `totalKm`. They are `undefined`.
- `GenerateBalanceInvoiceModal.tsx` (lines 238-239) just forwards those undefined values.
- The screenshot text "Quoted: 0 km | Actual: 0 km" proves the saved adjustment row has `original_quoted_km = 0` and `actual_km_traveled = 0` (because of stale-prop save inside `PostTripAdjustmentModal`).
- Result: invoice's Mileage cell ends up showing 0 or only the "fixed rate 1 km – 100 km" boilerplate, never the real total traveled distance.

### Bug 2: Quotation-time "Additional Distance" (extra km added inside the quotation form via Additional Charges) is invisible on the invoice
- The quotation form supports `additional_charges` JSONB items of type `additional_distance` (each with its own `distance` + `amount`). See `EnhancedCostCalculator.tsx` line 333-336 (`additionalDistanceFromCharges`) and `SpecialHireForm.tsx` (additional charges loader).
- These km **never** flow into the invoice's Mileage line, item description, or the "Original Quote Amount". Only the lump-sum money side hits `total_additional_charges` (rolled into `gross_revenue`), but the customer can't see *what* the extra km were.

### Bug 3: Post-trip adjustment row sometimes persists with `original_quoted_km = 0` / `actual_km_traveled = 0`
- `PostTripAdjustmentModal` props default `originalKm = 0`. If the modal opens before `trip.quotation.km_trip` is hydrated, `buildAdjustment()` snapshots 0.
- The DB row is then upserted with `original_quoted_km = 0`, even though `extra_km` was calculated using the live KM the user typed.
- Same for `actual_km_traveled` — if the user only typed the *extra* (or the input went via auto-set), the saved row stores 0 but `extra_km` ≠ 0.

## What I'll change

### Files

| File | Change |
|---|---|
| `src/components/special-hire/TripDetailsModal.tsx` | Pass real `tripDistance`, `totalKm`, full bus type, and `total_additional_charges` into `GenerateBalanceInvoiceModal`. Compute total trip distance = `km_parking_to_pickup + km_trip + km_drop_to_parking + Σ additional_charges[type='additional_distance'].distance`. |
| `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` | Accept and forward `tripDistance`, `totalKm`, plus a new `quotationAdditionalDistanceKm` and `quotationAdditionalChargeBreakdown[]`. Fill `actualKmTraveled` and `originalQuotedKm` on the `InvoiceData` even when only the quotation-time extras exist (no post-trip adjustment). |
| `src/lib/invoice-generator.ts` | (a) Robust mileage: prefer `actualKmTraveled`, then `tripDistance`, then `totalKm`, then `originalQuotedKm` — never silently 0. (b) When quotation has `additional_distance` charges, append a "Quotation Extra Distance" row right above the Extra KM Adjustment block in the totals table, plus include the quoted-extra km in the Mileage line as `Quoted: X KM (incl. +Y km extras)`. (c) Add the quotation-extra km charge as a visible totals row when present. |
| `src/components/special-hire/PostTripAdjustmentModal.tsx` | Guard `buildAdjustment()`: if `originalKm` prop is 0 but `actualKm > 0`, refuse to save with explicit toast; always force `original_quoted_km` to the resolved quotation `km_trip` (read once on open, never trust prop default of 0). Also force `actual_km_traveled = actualKm` (never default to 0) — using the `extraKm` value as a sanity check. |
| `src/hooks/usePostTripAdjustment.ts` | In `saveAdjustmentDraft` and `finalizeAdjustment`, validate that `original_quoted_km > 0` whenever `extra_km !== 0`. Throw a clear error if invariant breaks (so we never silently persist 0/0/+7.8 again). |
| `src/components/special-hire/EnhancedDocumentViewer.tsx` | Same fix as `GenerateBalanceInvoiceModal`: include `tripDistance` (computed total) and quotation-time additional distance in the rebuilt `InvoiceData` so signed/regenerated PDFs show the right Mileage too. |
| `src/lib/special-hire-invoice-helpers.ts` | Add `getInvoiceMileage(quotation, adjustment?)` helper that returns `{ quoted: number, actual: number, extras: number }` so all callers (invoice modal, document viewer, post-trip preview) compute the same mileage values. Use everywhere instead of ad-hoc math. |
| `src/components/special-hire/PostTripAdjustmentPreview.tsx` | Use the new helper so the PDF preview also reflects "Quoted (incl. quotation extras): X km / Actual: Y km" consistently. |

### One-time DB cleanup (small migration)
For existing `special_hire_trip_adjustments` rows where `original_quoted_km = 0` AND a parent quotation has `km_trip > 0`:
- Backfill `original_quoted_km = quotations.km_trip` (with parking-to-pickup + drop-to-parking added if available).
- Backfill `actual_km_traveled = original_quoted_km + extra_km` so existing already-finalized invoices regenerate correctly.
- Scope: Special Hire only; do **not** touch SBO/YUT/SNT/LTV.

### Behavior after the fix (matches your screenshots)

1. The Invoice "Mileage" line will show:
   - With post-trip adjustment: `Mileage: 108 KM (Quoted: 100.2 KM, +7.8 km extra)` instead of `100.2 KM`.
   - With quotation-time extra distance only (no post-trip adj): `Mileage: 120 KM (Base: 100 KM, +20 km quotation extras)`.
   - With both: combined display showing base, quotation extras, and post-trip extras.
2. The "Item Detail" remark line will spell out the route, and the totals table will show:
   - **Quotation Extra Distance Charge** (when applicable) — separate row, visible to customer.
   - **Extra KM Adjustment** (post-trip) — already exists, will now also display the correct quoted vs actual values.
3. The financial flow stays unchanged — `total_additional_charges` already rolls into `Original Quote Amount`. We're just **making it visible** on the customer document.
4. Future post-trip adjustments cannot be saved with `original_quoted_km = 0` while `extra_km ≠ 0` — the system will throw a clear toast and refuse.
5. Existing broken invoices (like the one in your screenshot) regenerate correctly after the one-time backfill.

### Out of scope (say the word for any)
- Re-issuing/auto-resending the already-emailed broken invoices.
- Adding a "Distance breakdown" sub-table on the QuotationPreview.tsx (only invoice fixed here).
- Changing the GL posting amounts (numbers stay identical; only display strings change, plus the quotation-extra row that was already in the GL via `total_additional_charges`).

