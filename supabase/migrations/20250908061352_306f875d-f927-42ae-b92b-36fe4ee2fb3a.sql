-- Create customers table for Yutong sales
CREATE TABLE public.yutong_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Sri Lanka',
  customer_type TEXT DEFAULT 'business' CHECK (customer_type IN ('business', 'individual', 'government')),
  credit_limit NUMERIC DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  tax_number TEXT,
  business_registration_no TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.yutong_customers ENABLE ROW LEVEL SECURITY;

-- Create policies for yutong_customers
CREATE POLICY "All authenticated users can view customers" 
ON public.yutong_customers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customers" 
ON public.yutong_customers 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create customer purchase history table
CREATE TABLE public.yutong_customer_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.yutong_customers(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES public.yutong_quotations(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for purchase history
ALTER TABLE public.yutong_customer_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for purchase history
CREATE POLICY "All authenticated users can view purchase history" 
ON public.yutong_customer_purchases 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage purchase history" 
ON public.yutong_customer_purchases 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Update yutong_quotations to reference customer
ALTER TABLE public.yutong_quotations 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.yutong_customers(id);

-- Create function to generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq INT;
BEGIN
  seq := nextval('public.yutong_customer_code_seq');
  RETURN 'YTC-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
END;
$$;

-- Create sequence for customer codes
CREATE SEQUENCE IF NOT EXISTS public.yutong_customer_code_seq START 1;

-- Create trigger to auto-generate customer code
CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code = public.generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_customer_code_trigger
  BEFORE INSERT ON public.yutong_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_code();

-- Create trigger for updated_at
CREATE TRIGGER update_yutong_customers_updated_at
  BEFORE UPDATE ON public.yutong_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();