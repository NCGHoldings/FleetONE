-- Backfill fuel_price_per_liter for existing quotations that have NULL values
-- Join with fuel_settings using parking_location_id to get the correct diesel price
UPDATE public.special_hire_quotations q
SET fuel_price_per_liter = fs.diesel_price_lkr_per_l
FROM public.fuel_settings fs
WHERE q.parking_location_id = fs.id
  AND q.fuel_price_per_liter IS NULL;