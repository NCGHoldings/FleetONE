

# Continue: Special Hire Mileage Fix — Remaining Tasks

Picking up from the last batch. Three items left from the approved plan.

## 1. Backfill broken adjustment rows (DB migration)

Targeted, Special-Hire-only migration. Scope: `special_hire_trip_adjustments` rows where `original_quoted_km = 0` but parent quotation has `km_trip > 0`.

```sql
-- Backfill original_quoted_km from quotations.km_trip (+ parking legs if available)
UPDATE special_hire_trip_adjustments a
SET original_quoted_km = COALESCE(q.km_trip, 0)
                       + COALESCE(q.km_parking_to_pickup, 0)
                       + COALESCE(q.km_drop_to_parking, 0)
FROM quotations q
WHERE a.quotation_id = q.id
  AND a.original_quoted_km = 0
  AND COALESCE(q.km_trip, 0) > 0;

-- Backfill actual_km_traveled = quoted + extra so existing finalized invoices regenerate correctly
UPDATE special_hire_trip_adjustments
SET actual_km_traveled = original_quoted_km + COALESCE(extra_km, 0)
WHERE actual_km_traveled = 0
  AND original_quoted_km > 0;
```

No SBO / YUT / SNT / LTV rows touched.

## 2. Sync `PostTripAdjustmentPreview.tsx` to the new helper

Replace local mileage math with `getInvoiceMileage(quotation, adjustment)` from `src/lib/special-hire-invoice-helpers.ts` so the post-trip preview shows the same Quoted / Actual / Extras numbers as the final invoice and the document viewer.

## 3. Sync `TripDetailsModal.tsx` props to `GenerateBalanceInvoiceModal`

Pass the full distance context the invoice generator now expects:
- `tripDistance` = `km_parking_to_pickup + km_trip + km_drop_to_parking + Σ additional_charges[type='additional_distance'].distance`
- `totalKm` = same total (legacy alias)
- `quotationAdditionalDistanceKm` and `quotationAdditionalChargeBreakdown[]` from the loaded quotation
- `total_additional_charges` for amount-side parity

This closes the "modal opened from spreadsheet" path so the Mileage line is correct without needing a post-trip adjustment.

## Files

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Backfill `original_quoted_km` and `actual_km_traveled` for Special Hire adjustments only |
| `src/components/special-hire/PostTripAdjustmentPreview.tsx` | Use `getInvoiceMileage()` instead of inline math |
| `src/components/special-hire/TripDetailsModal.tsx` | Compute and pass `tripDistance`, `totalKm`, quotation-extra distance breakdown into `GenerateBalanceInvoiceModal` |

## After this finishes

- Already-finalized broken invoices regenerate with correct Quoted / Actual / Extras KM.
- Post-trip preview, final invoice PDF, and signed/regenerated PDFs all show identical mileage values (single source of truth).
- Invoices generated directly from the trip spreadsheet (without a post-trip adjustment) also show the right Mileage and any quotation-time Extra Distance row.
- No other branch / module is touched.

