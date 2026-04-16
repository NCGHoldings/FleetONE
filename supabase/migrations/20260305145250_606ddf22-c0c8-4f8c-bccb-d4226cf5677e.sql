
CREATE TABLE public.ap_payment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.ap_payments(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ap_payment_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage ap_payment_lines" ON public.ap_payment_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.ap_payments ADD COLUMN is_direct_payment BOOLEAN DEFAULT false;
