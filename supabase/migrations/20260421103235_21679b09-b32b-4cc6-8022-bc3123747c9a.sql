-- Backfill broken Special Hire post-trip adjustment rows.
-- Scope: special_hire_trip_adjustments only. SBO/YUT/SNT/LTV are NOT touched.

-- 1) Backfill original_quoted_km from parent quotation when it was lost as 0.
UPDATE public.special_hire_trip_adjustments a
SET original_quoted_km = COALESCE(q.km_trip, 0)
                       + COALESCE(q.km_parking_to_pickup, 0)
                       + COALESCE(q.km_drop_to_parking, 0)
FROM public.special_hire_quotations q
WHERE a.quotation_id = q.id
  AND COALESCE(a.original_quoted_km, 0) = 0
  AND COALESCE(q.km_trip, 0) > 0;

-- 2) Backfill actual_km_traveled = quoted + extra so already-finalized invoices regenerate correctly.
UPDATE public.special_hire_trip_adjustments
SET actual_km_traveled = original_quoted_km + COALESCE(extra_km, 0)
WHERE COALESCE(actual_km_traveled, 0) = 0
  AND COALESCE(original_quoted_km, 0) > 0;
