-- Special Hire Finance Settings table for GL account mappings
CREATE TABLE public.special_hire_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Revenue Accounts
  revenue_internal_account_id UUID REFERENCES chart_of_accounts(id),
  revenue_external_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Receivable Account
  trade_receivable_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Customer Advance (Liability)
  customer_advance_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Bank/Cash Accounts
  default_bank_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Expense Accounts
  discount_expense_account_id UUID REFERENCES chart_of_accounts(id),
  commission_expense_account_id UUID REFERENCES chart_of_accounts(id),
  refund_expense_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Tax Accounts (optional)
  vat_output_account_id UUID REFERENCES chart_of_accounts(id),
  wht_payable_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Auto-posting settings
  auto_post_advance_payments BOOLEAN DEFAULT false,
  auto_post_invoices BOOLEAN DEFAULT false,
  auto_post_balance_payments BOOLEAN DEFAULT false,
  
  -- Numbering prefixes
  invoice_prefix TEXT DEFAULT 'SPH-INV',
  advance_receipt_prefix TEXT DEFAULT 'SPH-ADV',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.special_hire_finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view special hire finance settings"
  ON public.special_hire_finance_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert special hire finance settings"
  ON public.special_hire_finance_settings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update special hire finance settings"
  ON public.special_hire_finance_settings
  FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_special_hire_finance_settings_company 
  ON public.special_hire_finance_settings(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_special_hire_finance_settings_updated_at
  BEFORE UPDATE ON public.special_hire_finance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.special_hire_finance_settings IS 'GL account mappings for Special Hire module - maps advance payments, invoices, and balance payments to chart of accounts';