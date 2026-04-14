-- Add a new column to store the exceeding km threshold (100 or 200)
ALTER TABLE public.hire_rate_cards 
ADD COLUMN exceeding_km_threshold numeric DEFAULT 100;

-- Update existing records to have the default 100km threshold
UPDATE public.hire_rate_cards 
SET exceeding_km_threshold = 100 
WHERE exceeding_km_threshold IS NULL;