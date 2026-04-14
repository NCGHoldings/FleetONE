-- Add discount type selection and fixed amount discount fields
ALTER TABLE public.special_hire_quotations 
ADD COLUMN discount_type text DEFAULT 'percentage',
ADD COLUMN discount_amount_lkr numeric DEFAULT 0;