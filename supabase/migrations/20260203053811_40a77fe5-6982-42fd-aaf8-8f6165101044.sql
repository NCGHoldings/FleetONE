-- Add columns for manual parking distance override feature
ALTER TABLE public.special_hire_quotations 
ADD COLUMN IF NOT EXISTS uses_manual_parking_distance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_km_parking_to_pickup numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_km_drop_to_parking numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.special_hire_quotations.uses_manual_parking_distance IS 'Flag indicating manual parking distance override is enabled';
COMMENT ON COLUMN public.special_hire_quotations.manual_km_parking_to_pickup IS 'User-entered parking to pickup distance (km)';
COMMENT ON COLUMN public.special_hire_quotations.manual_km_drop_to_parking IS 'User-entered drop to parking distance (km)';