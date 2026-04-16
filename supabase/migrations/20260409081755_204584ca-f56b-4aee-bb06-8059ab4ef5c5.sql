ALTER TABLE public.school_bus_finance_settings 
ADD COLUMN IF NOT EXISTS billing_percentage numeric DEFAULT 80;