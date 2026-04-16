-- Add is_free_of_charge column to yutong_quotation_addons table
ALTER TABLE public.yutong_quotation_addons 
ADD COLUMN IF NOT EXISTS is_free_of_charge BOOLEAN DEFAULT false;

-- Update existing records to have default value
UPDATE public.yutong_quotation_addons 
SET is_free_of_charge = false 
WHERE is_free_of_charge IS NULL;