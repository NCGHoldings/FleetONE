-- School Bus Finance Integration Settings (branch-wise GL mappings)
CREATE TABLE public.school_bus_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  branch_id UUID REFERENCES school_branches(id),
  -- AR Invoice Settings
  trade_receivable_account_id UUID REFERENCES chart_of_accounts(id),
  sbs_collection_account_id UUID REFERENCES chart_of_accounts(id),
  -- Bank Account for payments (branch-wise)
  bank_account_id UUID REFERENCES bank_accounts(id),
  cash_account_id UUID REFERENCES chart_of_accounts(id),
  -- Auto-posting settings
  auto_post_invoices BOOLEAN DEFAULT false,
  auto_post_payments BOOLEAN DEFAULT false,
  invoice_prefix TEXT DEFAULT 'SBS-INV',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.school_bus_finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view school bus finance settings" ON public.school_bus_finance_settings
  FOR SELECT USING (true);

CREATE POLICY "Users can manage school bus finance settings" ON public.school_bus_finance_settings
  FOR ALL USING (true);

-- Link students to AR customers
CREATE TABLE public.school_student_ar_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES school_students(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.school_student_ar_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view student AR links" ON public.school_student_ar_link
  FOR SELECT USING (true);

CREATE POLICY "Users can manage student AR links" ON public.school_student_ar_link
  FOR ALL USING (true);

-- AR Invoice Batches for bulk generation
CREATE TABLE public.school_ar_invoice_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  branch_id UUID REFERENCES school_branches(id),
  batch_number TEXT NOT NULL,
  invoice_month DATE NOT NULL,
  total_students INTEGER DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, posted, cancelled
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES journal_entries(id)
);

ALTER TABLE public.school_ar_invoice_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AR invoice batches" ON public.school_ar_invoice_batches
  FOR SELECT USING (true);

CREATE POLICY "Users can manage AR invoice batches" ON public.school_ar_invoice_batches
  FOR ALL USING (true);

-- Individual student AR invoices within a batch
CREATE TABLE public.school_ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES school_ar_invoice_batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES school_students(id),
  ar_invoice_id UUID REFERENCES ar_invoices(id),
  invoice_number TEXT NOT NULL,
  invoice_month DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, posted, paid, cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.school_ar_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view school AR invoices" ON public.school_ar_invoices
  FOR SELECT USING (true);

CREATE POLICY "Users can manage school AR invoices" ON public.school_ar_invoices
  FOR ALL USING (true);

-- Add GL tracking columns to school_payment_transactions
ALTER TABLE public.school_payment_transactions
ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES ar_receipts(id),
ADD COLUMN IF NOT EXISTS gl_posted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id);

-- Function to generate batch number
CREATE OR REPLACE FUNCTION generate_sbs_batch_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number FROM 'SBS-BATCH-\d{6}-(\d+)') AS INTEGER)), 0) + 1
  INTO v_seq
  FROM school_ar_invoice_batches
  WHERE batch_number LIKE 'SBS-BATCH-' || TO_CHAR(NOW(), 'YYYYMM') || '-%';
  
  v_number := 'SBS-BATCH-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate SBS invoice number
CREATE OR REPLACE FUNCTION generate_sbs_invoice_number(p_prefix TEXT DEFAULT 'SBS-INV')
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM p_prefix || '-\d{6}-(\d+)') AS INTEGER)), 0) + 1
  INTO v_seq
  FROM school_ar_invoices
  WHERE invoice_number LIKE p_prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-%';
  
  v_number := p_prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_seq::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;