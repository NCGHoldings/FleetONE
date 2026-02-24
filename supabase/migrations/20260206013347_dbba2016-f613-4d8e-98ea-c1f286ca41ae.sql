-- ============================================
-- LEASING FINANCE INTEGRATION SCHEMA
-- ============================================

-- 1. Create leasing_finance_settings table for GL account mappings
CREATE TABLE IF NOT EXISTS public.leasing_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  business_unit_code VARCHAR(10) DEFAULT 'FLEET',
  
  -- Vendor/Lender mapping
  auto_create_vendor BOOLEAN DEFAULT true,
  
  -- GL Account Mappings
  bank_account_id UUID REFERENCES public.chart_of_accounts(id),
  leasing_liability_account_id UUID REFERENCES public.chart_of_accounts(id),
  interest_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  lease_asset_account_id UUID REFERENCES public.chart_of_accounts(id),
  
  -- Automation toggles
  auto_create_ap_invoice BOOLEAN DEFAULT true,
  auto_post_gl_on_payment BOOLEAN DEFAULT true,
  ap_prefix VARCHAR(20) DEFAULT 'LEASE-AP',
  gl_prefix VARCHAR(20) DEFAULT 'LEASE-GL',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.leasing_finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view leasing finance settings" 
ON public.leasing_finance_settings FOR SELECT USING (true);

CREATE POLICY "Users can insert leasing finance settings" 
ON public.leasing_finance_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update leasing finance settings" 
ON public.leasing_finance_settings FOR UPDATE USING (true);

-- 2. Add finance columns to bus_loans table
ALTER TABLE public.bus_loans 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id),
ADD COLUMN IF NOT EXISTS business_unit_code VARCHAR(10) DEFAULT 'FLEET',
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS initial_je_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS finance_synced BOOLEAN DEFAULT false;

-- 3. Add finance columns to bus_loan_payments table
ALTER TABLE public.bus_loan_payments 
ADD COLUMN IF NOT EXISTS ap_invoice_id UUID REFERENCES public.ap_invoices(id),
ADD COLUMN IF NOT EXISTS ap_payment_id UUID REFERENCES public.ap_payments(id),
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id),
ADD COLUMN IF NOT EXISTS gl_posted BOOLEAN DEFAULT false;

-- 4. Add bus/route tracking to journal_entry_lines for enhanced filtering
ALTER TABLE public.journal_entry_lines 
ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES public.buses(id),
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.routes(id),
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.daily_trips(id),
ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES public.daily_bus_expenses(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_je_lines_bus_id ON public.journal_entry_lines(bus_id);
CREATE INDEX IF NOT EXISTS idx_je_lines_route_id ON public.journal_entry_lines(route_id);
CREATE INDEX IF NOT EXISTS idx_je_lines_trip_id ON public.journal_entry_lines(trip_id);
CREATE INDEX IF NOT EXISTS idx_je_lines_expense_id ON public.journal_entry_lines(expense_id);
CREATE INDEX IF NOT EXISTS idx_bus_loans_vendor_id ON public.bus_loans(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bus_loans_company_id ON public.bus_loans(company_id);
CREATE INDEX IF NOT EXISTS idx_bus_loan_payments_ap_invoice ON public.bus_loan_payments(ap_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bus_loan_payments_journal ON public.bus_loan_payments(journal_entry_id);

-- 6. Create trigger for updated_at on leasing_finance_settings
CREATE OR REPLACE FUNCTION public.update_leasing_finance_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leasing_finance_settings_timestamp ON public.leasing_finance_settings;
CREATE TRIGGER update_leasing_finance_settings_timestamp
BEFORE UPDATE ON public.leasing_finance_settings
FOR EACH ROW EXECUTE FUNCTION public.update_leasing_finance_settings_updated_at();