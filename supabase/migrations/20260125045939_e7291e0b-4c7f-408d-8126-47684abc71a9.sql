-- ============================================
-- Vehicle Sales Finance Integration Schema
-- Yutong, Sinotruck, Light Vehicle modules
-- ============================================

-- 1. Create Sinotruck Orders Table (was missing!)
CREATE TABLE IF NOT EXISTS public.sinotruck_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  quotation_id UUID REFERENCES public.sinotruck_quotations(id) ON DELETE SET NULL,
  customer_id UUID,
  truck_model TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(15,2),
  total_amount NUMERIC(15,2),
  total_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2),
  payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'lease', 'lc')),
  payment_structure JSONB,
  current_phase TEXT DEFAULT 'order_confirmation',
  progress_percentage INTEGER DEFAULT 0,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  finance_customer_id UUID REFERENCES public.customers(id),
  ar_invoice_id UUID REFERENCES public.ar_invoices(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sinotruck order sequence
CREATE SEQUENCE IF NOT EXISTS public.sinotruck_order_seq START 1;

-- Function to generate sinotruck order number
CREATE OR REPLACE FUNCTION public.generate_sinotruck_order_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.sinotruck_order_seq');
  RETURN 'STO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-set order number
CREATE OR REPLACE FUNCTION public.set_sinotruck_order_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no = public.generate_sinotruck_order_no();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sinotruck_order_no_trigger ON public.sinotruck_orders;
CREATE TRIGGER set_sinotruck_order_no_trigger
  BEFORE INSERT ON public.sinotruck_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sinotruck_order_no();

-- 2. Create Sinotruck Customer Payments Table (missing!)
CREATE TABLE IF NOT EXISTS public.sinotruck_customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sinotruck_orders(id) ON DELETE CASCADE,
  payment_schedule_id UUID,
  payment_amount NUMERIC(15,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_reference TEXT,
  bank_name TEXT,
  cheque_no TEXT,
  bank_slip_no TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  ar_receipt_id UUID REFERENCES public.ar_receipts(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Sinotruck Payment Schedules Table
CREATE TABLE IF NOT EXISTS public.sinotruck_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sinotruck_orders(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  due_date DATE,
  amount NUMERIC(15,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Yutong Finance Settings Table
CREATE TABLE IF NOT EXISTS public.yutong_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  spare_parts_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  trade_receivable_account_id UUID REFERENCES public.chart_of_accounts(id),
  customer_advance_account_id UUID REFERENCES public.chart_of_accounts(id),
  default_bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  lc_bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  discount_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  commission_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  vat_output_account_id UUID REFERENCES public.chart_of_accounts(id),
  wht_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
  auto_post_on_verify BOOLEAN DEFAULT true,
  auto_create_customer BOOLEAN DEFAULT true,
  invoice_prefix TEXT DEFAULT 'YUT-INV',
  receipt_prefix TEXT DEFAULT 'YUT-RCT',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 5. Create Sinotruck Finance Settings Table
CREATE TABLE IF NOT EXISTS public.sinotruck_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  spare_parts_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  trade_receivable_account_id UUID REFERENCES public.chart_of_accounts(id),
  customer_advance_account_id UUID REFERENCES public.chart_of_accounts(id),
  default_bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  lc_bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  discount_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  commission_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  vat_output_account_id UUID REFERENCES public.chart_of_accounts(id),
  wht_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
  auto_post_on_verify BOOLEAN DEFAULT true,
  auto_create_customer BOOLEAN DEFAULT true,
  invoice_prefix TEXT DEFAULT 'SNT-INV',
  receipt_prefix TEXT DEFAULT 'SNT-RCT',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 6. Create Light Vehicle Finance Settings Table
CREATE TABLE IF NOT EXISTS public.lightvehicle_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  spare_parts_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
  trade_receivable_account_id UUID REFERENCES public.chart_of_accounts(id),
  customer_advance_account_id UUID REFERENCES public.chart_of_accounts(id),
  default_bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  lc_bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  discount_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  commission_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  vat_output_account_id UUID REFERENCES public.chart_of_accounts(id),
  wht_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
  auto_post_on_verify BOOLEAN DEFAULT true,
  auto_create_customer BOOLEAN DEFAULT true,
  invoice_prefix TEXT DEFAULT 'LTV-INV',
  receipt_prefix TEXT DEFAULT 'LTV-RCT',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 7. Add finance columns to yutong_orders
ALTER TABLE public.yutong_orders 
ADD COLUMN IF NOT EXISTS finance_customer_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES public.ar_invoices(id);

-- 8. Add finance columns to yutong_customer_payments
ALTER TABLE public.yutong_customer_payments
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES public.ar_receipts(id);

-- 9. Add finance columns to lightvehicle_orders
ALTER TABLE public.lightvehicle_orders 
ADD COLUMN IF NOT EXISTS finance_customer_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES public.ar_invoices(id);

-- 10. Add finance columns to lightvehicle_customer_payments
ALTER TABLE public.lightvehicle_customer_payments
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES public.ar_receipts(id);

-- 11. RLS Policies
ALTER TABLE public.sinotruck_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_finance_settings ENABLE ROW LEVEL SECURITY;

-- Sinotruck orders policies
CREATE POLICY "Authenticated users can view sinotruck_orders"
  ON public.sinotruck_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sinotruck_orders"
  ON public.sinotruck_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sinotruck_orders"
  ON public.sinotruck_orders FOR UPDATE TO authenticated USING (true);

-- Sinotruck customer payments policies
CREATE POLICY "Authenticated users can view sinotruck_customer_payments"
  ON public.sinotruck_customer_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sinotruck_customer_payments"
  ON public.sinotruck_customer_payments FOR ALL TO authenticated USING (true);

-- Sinotruck payment schedules policies
CREATE POLICY "Authenticated users can view sinotruck_payment_schedules"
  ON public.sinotruck_payment_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sinotruck_payment_schedules"
  ON public.sinotruck_payment_schedules FOR ALL TO authenticated USING (true);

-- Finance settings policies
CREATE POLICY "Authenticated users can view yutong_finance_settings"
  ON public.yutong_finance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage yutong_finance_settings"
  ON public.yutong_finance_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can view sinotruck_finance_settings"
  ON public.sinotruck_finance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sinotruck_finance_settings"
  ON public.sinotruck_finance_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can view lightvehicle_finance_settings"
  ON public.lightvehicle_finance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage lightvehicle_finance_settings"
  ON public.lightvehicle_finance_settings FOR ALL TO authenticated USING (true);

-- 12. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sinotruck_orders_quotation ON public.sinotruck_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_sinotruck_orders_status ON public.sinotruck_orders(status);
CREATE INDEX IF NOT EXISTS idx_sinotruck_customer_payments_order ON public.sinotruck_customer_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_sinotruck_payment_schedules_order ON public.sinotruck_payment_schedules(order_id);
CREATE INDEX IF NOT EXISTS idx_yutong_orders_finance_customer ON public.yutong_orders(finance_customer_id);
CREATE INDEX IF NOT EXISTS idx_lightvehicle_orders_finance_customer ON public.lightvehicle_orders(finance_customer_id);

-- 13. Trigger to update sinotruck order financials when payments change
CREATE OR REPLACE FUNCTION public.update_sinotruck_order_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.sinotruck_orders 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.sinotruck_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status IN ('received', 'verified')
    ),
    balance_due = total_amount - (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.sinotruck_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status IN ('received', 'verified')
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_sinotruck_order_financials_trigger ON public.sinotruck_customer_payments;
CREATE TRIGGER update_sinotruck_order_financials_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sinotruck_customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sinotruck_order_financials();