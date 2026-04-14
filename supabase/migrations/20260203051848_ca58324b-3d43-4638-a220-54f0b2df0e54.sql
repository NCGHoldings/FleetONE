-- Add uses_pickup_as_parking column to special_hire_quotations
ALTER TABLE public.special_hire_quotations 
ADD COLUMN IF NOT EXISTS uses_pickup_as_parking BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.special_hire_quotations.uses_pickup_as_parking IS 'When true, pickup location is same as parking - no empty run costs';