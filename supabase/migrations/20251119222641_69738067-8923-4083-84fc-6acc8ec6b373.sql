-- Create Sinotruck Truck Models table
CREATE TABLE IF NOT EXISTS public.sinotruck_truck_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  capacity_kw NUMERIC NOT NULL,
  year INTEGER NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Brand New',
  base_price NUMERIC NOT NULL,
  charger_price NUMERIC,
  charger_capacity_kw NUMERIC,
  specifications JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Sinotruck Customers table
CREATE TABLE IF NOT EXISTS public.sinotruck_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  address TEXT,
  contact_number TEXT,
  email TEXT,
  customer_type TEXT DEFAULT 'company',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Sinotruck Quotations table
CREATE TABLE IF NOT EXISTS public.sinotruck_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no TEXT UNIQUE NOT NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.sinotruck_customers(id),
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  contact_number TEXT,
  truck_model_id UUID REFERENCES public.sinotruck_truck_models(id),
  truck_model_name TEXT NOT NULL,
  capacity_kw NUMERIC NOT NULL,
  year INTEGER NOT NULL,
  condition TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  charger_price NUMERIC,
  charger_capacity_kw NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  payment_terms TEXT,
  terms_and_conditions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  version_number TEXT DEFAULT '1.0',
  parent_quotation_id UUID REFERENCES public.sinotruck_quotations(id),
  is_active_version BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Sinotruck Quotation Signatures table
CREATE TABLE IF NOT EXISTS public.sinotruck_quotation_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.sinotruck_quotations(id) ON DELETE CASCADE,
  signature_role TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'drawing',
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  signed_by UUID,
  UNIQUE(quotation_id, signature_role)
);

-- Create sequences for auto-generation
CREATE SEQUENCE IF NOT EXISTS public.sinotruck_quotation_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.sinotruck_customer_code_seq START WITH 1;

-- Function to generate Sinotruck quotation number
CREATE OR REPLACE FUNCTION public.generate_sinotruck_quotation_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.sinotruck_quotation_seq');
  RETURN 'NCGST' || TO_CHAR(NOW(), 'YY') || LPAD(seq_val::TEXT, 3, '0');
END;
$$;

-- Function to generate Sinotruck customer code
CREATE OR REPLACE FUNCTION public.generate_sinotruck_customer_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_val INT;
BEGIN
  seq_val := nextval('public.sinotruck_customer_code_seq');
  RETURN 'NCGST-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-generate customer code
CREATE OR REPLACE FUNCTION public.set_sinotruck_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code = public.generate_sinotruck_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_sinotruck_customer_code
  BEFORE INSERT ON public.sinotruck_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sinotruck_customer_code();

-- Trigger to auto-generate quotation number
CREATE OR REPLACE FUNCTION public.set_sinotruck_quotation_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.quotation_no IS NULL OR NEW.quotation_no = '' THEN
    NEW.quotation_no = public.generate_sinotruck_quotation_no();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_sinotruck_quotation_no
  BEFORE INSERT ON public.sinotruck_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sinotruck_quotation_no();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_sinotruck_truck_models_updated_at
  BEFORE UPDATE ON public.sinotruck_truck_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sinotruck_customers_updated_at
  BEFORE UPDATE ON public.sinotruck_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sinotruck_quotations_updated_at
  BEFORE UPDATE ON public.sinotruck_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.sinotruck_truck_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_quotation_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Truck Models
CREATE POLICY "Authenticated users can view truck models"
  ON public.sinotruck_truck_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage truck models"
  ON public.sinotruck_truck_models FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for Customers
CREATE POLICY "Authenticated users can view customers"
  ON public.sinotruck_customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage customers"
  ON public.sinotruck_customers FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for Quotations
CREATE POLICY "Authenticated users can view quotations"
  ON public.sinotruck_quotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage quotations"
  ON public.sinotruck_quotations FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for Signatures
CREATE POLICY "Authenticated users can view signatures"
  ON public.sinotruck_quotation_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage signatures"
  ON public.sinotruck_quotation_signatures FOR ALL
  TO authenticated
  USING (true);