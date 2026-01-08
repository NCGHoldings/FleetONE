-- Create NSP Daily Sales table
CREATE TABLE public.nsp_daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  lss_outside_sale NUMERIC DEFAULT 0 NOT NULL,
  lss_inside_sale NUMERIC DEFAULT 0 NOT NULL,
  tyre_sale NUMERIC DEFAULT 0 NOT NULL,
  tyre_quantity TEXT,
  pepiliyana_sale NUMERIC DEFAULT 0 NOT NULL,
  other_income JSONB DEFAULT '[]'::jsonb,
  total_sale NUMERIC DEFAULT 0 NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(sale_date)
);

-- Enable RLS
ALTER TABLE public.nsp_daily_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view NSP sales"
ON public.nsp_daily_sales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and supervisors can insert NSP sales"
ON public.nsp_daily_sales
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Admins and supervisors can update NSP sales"
ON public.nsp_daily_sales
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Admins can delete NSP sales"
ON public.nsp_daily_sales
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Function to calculate total sale
CREATE OR REPLACE FUNCTION public.calculate_nsp_total_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  other_income_total NUMERIC := 0;
  item JSONB;
BEGIN
  -- Calculate sum of other income
  IF NEW.other_income IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.other_income)
    LOOP
      other_income_total := other_income_total + COALESCE((item->>'amount')::numeric, 0);
    END LOOP;
  END IF;
  
  -- Calculate total sale
  NEW.total_sale := COALESCE(NEW.lss_outside_sale, 0) + 
                    COALESCE(NEW.lss_inside_sale, 0) + 
                    COALESCE(NEW.tyre_sale, 0) + 
                    COALESCE(NEW.pepiliyana_sale, 0) + 
                    other_income_total;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate total_sale
CREATE TRIGGER calculate_nsp_total_before_insert_update
BEFORE INSERT OR UPDATE ON public.nsp_daily_sales
FOR EACH ROW
EXECUTE FUNCTION public.calculate_nsp_total_sale();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_nsp_daily_sales_updated_at
BEFORE UPDATE ON public.nsp_daily_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();