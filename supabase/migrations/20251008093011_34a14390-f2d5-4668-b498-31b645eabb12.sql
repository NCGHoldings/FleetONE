-- Add customer type and company registration fields to yutong_quotations
ALTER TABLE public.yutong_quotations 
ADD COLUMN customer_type text DEFAULT 'personal' CHECK (customer_type IN ('personal', 'company')),
ADD COLUMN business_registration_number text,
ADD COLUMN tax_registration_number text;