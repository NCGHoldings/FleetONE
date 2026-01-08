-- Add discount_amount column to yutong_quotations table for fixed amount discounts
ALTER TABLE public.yutong_quotations 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN public.yutong_quotations.discount_amount IS 'Fixed discount amount in LKR (replaces percentage-based discount)';

-- Update existing records to calculate discount_amount from discount_percentage if needed
UPDATE public.yutong_quotations
SET discount_amount = (quantity * unit_price * COALESCE(discount_percentage, 0) / 100)
WHERE discount_amount IS NULL OR discount_amount = 0;