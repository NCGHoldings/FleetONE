
-- Create gl_settings table for Core GL configuration
CREATE TABLE public.gl_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  trade_receivable_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  trade_payable_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  sales_revenue_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  default_expense_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  customer_advance_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  wht_payable_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  expense_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gl_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read, finance/admin/super_admin can modify
CREATE POLICY "Authenticated users can view gl_settings"
  ON public.gl_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance and admin can insert gl_settings"
  ON public.gl_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE POLICY "Finance and admin can update gl_settings"
  ON public.gl_settings FOR UPDATE
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

-- Indexes
CREATE INDEX idx_gl_settings_company_id ON public.gl_settings(company_id);

-- Updated_at trigger
CREATE TRIGGER set_gl_settings_updated_at
  BEFORE UPDATE ON public.gl_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_updated_at();
