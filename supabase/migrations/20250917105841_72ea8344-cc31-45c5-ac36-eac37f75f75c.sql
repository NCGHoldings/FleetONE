-- Update the Leyland bus rate card to set correct exceeding km rate
UPDATE public.hire_rate_cards 
SET 
  exceeding_km_rate_lkr = 175,
  updated_at = now()
WHERE bus_type_id = '992f4f99-b611-4220-b19b-8e2543889bf6' 
  AND id = 'f5ab8f83-8cbc-4bd6-8272-6744a3047fa6';

-- Also check if we need to create an Outside hire type rate card for Leyland buses if it doesn't exist
INSERT INTO public.hire_rate_cards (
  hire_type,
  bus_type_id,
  from_km,
  to_km,
  flat_fee_lkr,
  exceeding_km_rate_lkr,
  exceeding_km_threshold,
  free_exceeding_km,
  standard_hours,
  overtime_rate_lkr_per_hour,
  overnight_charge_lkr_per_day,
  effective_from,
  is_active
) 
SELECT 
  'Outside',
  '992f4f99-b611-4220-b19b-8e2543889bf6',
  0,
  999999,
  50000,
  175,
  200,
  5,
  8,
  500,
  0,
  CURRENT_DATE,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.hire_rate_cards 
  WHERE bus_type_id = '992f4f99-b611-4220-b19b-8e2543889bf6' 
    AND hire_type = 'Outside' 
    AND is_active = true
);