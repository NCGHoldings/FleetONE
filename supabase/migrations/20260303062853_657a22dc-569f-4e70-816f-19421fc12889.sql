
-- Customer Categories table for GL account mapping per category
CREATE TABLE public.customer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  ar_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  revenue_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  advance_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, category_code)
);

-- Add category FK to customers table
ALTER TABLE public.customers ADD COLUMN customer_category_id UUID REFERENCES public.customer_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.customer_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view customer categories"
ON public.customer_categories FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert customer categories"
ON public.customer_categories FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update customer categories"
ON public.customer_categories FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete customer categories"
ON public.customer_categories FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- Indexes
CREATE INDEX idx_customer_categories_company_id ON public.customer_categories(company_id);
CREATE INDEX idx_customer_categories_ar_account ON public.customer_categories(ar_account_id);
CREATE INDEX idx_customer_categories_revenue_account ON public.customer_categories(revenue_account_id);
CREATE INDEX idx_customer_categories_advance_account ON public.customer_categories(advance_account_id);
CREATE INDEX idx_customers_category_id ON public.customers(customer_category_id);

-- Updated_at trigger
CREATE TRIGGER set_customer_categories_updated_at
  BEFORE UPDATE ON public.customer_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_updated_at();
