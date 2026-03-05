-- Create vendor_categories table mirroring customer_categories
CREATE TABLE public.vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  ap_account_id UUID REFERENCES public.chart_of_accounts(id),
  expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  advance_account_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, category_code)
);

-- Add vendor_category_id to vendors table
ALTER TABLE public.vendors 
ADD COLUMN vendor_category_id UUID REFERENCES public.vendor_categories(id);

-- Enable RLS
ALTER TABLE public.vendor_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow authenticated read vendor_categories" ON public.vendor_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert vendor_categories" ON public.vendor_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update vendor_categories" ON public.vendor_categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete vendor_categories" ON public.vendor_categories
  FOR DELETE TO authenticated USING (true);