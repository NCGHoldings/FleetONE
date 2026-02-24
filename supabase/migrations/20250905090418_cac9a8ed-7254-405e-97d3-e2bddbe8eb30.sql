-- Add additional charges fields to special_hire_quotations table
ALTER TABLE public.special_hire_quotations 
ADD COLUMN additional_charges JSONB DEFAULT '[]'::jsonb,
ADD COLUMN total_additional_charges NUMERIC DEFAULT 0;