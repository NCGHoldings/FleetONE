-- Create enums for accounting module
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE journal_status AS ENUM ('draft', 'posted', 'void');
CREATE TYPE ar_ap_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue');

-- Chart of Accounts table
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type account_type NOT NULL,
  parent_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entries table
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  status journal_status NOT NULL DEFAULT 'draft',
  total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entry Lines table
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  description TEXT,
  debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts Payable table
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(15, 2) NOT NULL,
  status ar_ap_status NOT NULL DEFAULT 'unpaid',
  account_id UUID REFERENCES public.chart_of_accounts(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts Receivable table
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(15, 2) NOT NULL,
  status ar_ap_status NOT NULL DEFAULT 'unpaid',
  account_id UUID REFERENCES public.chart_of_accounts(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial Periods table
CREATE TABLE public.financial_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequences for auto-generated numbers
CREATE SEQUENCE public.journal_entry_seq START 1;

-- Function to generate journal entry number
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.journal_entry_seq');
  RETURN 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$;

-- Trigger to auto-generate entry number
CREATE OR REPLACE FUNCTION public.set_journal_entry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    NEW.entry_number = public.generate_journal_entry_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_journal_entry_number_trigger
BEFORE INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_journal_entry_number();

-- Function to update account balances when journal entries are posted
CREATE OR REPLACE FUNCTION public.update_account_balances_on_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'posted' AND OLD.status = 'draft' THEN
    UPDATE public.chart_of_accounts coa
    SET current_balance = current_balance + COALESCE(
      (SELECT 
        CASE 
          WHEN coa.account_type IN ('asset', 'expense') THEN SUM(jel.debit - jel.credit)
          ELSE SUM(jel.credit - jel.debit)
        END
      FROM public.journal_entry_lines jel
      WHERE jel.journal_entry_id = NEW.id
        AND jel.account_id = coa.id
      ), 0),
      updated_at = now()
    WHERE id IN (
      SELECT DISTINCT account_id 
      FROM public.journal_entry_lines 
      WHERE journal_entry_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_account_balances_trigger
AFTER UPDATE ON public.journal_entries
FOR EACH ROW
WHEN (NEW.status = 'posted' AND OLD.status = 'draft')
EXECUTE FUNCTION public.update_account_balances_on_post();

-- Function to calculate and update journal entry totals
CREATE OR REPLACE FUNCTION public.update_journal_entry_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.journal_entries
  SET 
    total_debit = (SELECT COALESCE(SUM(debit), 0) FROM public.journal_entry_lines WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM public.journal_entry_lines WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_journal_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_journal_entry_totals();

-- Function to update AP/AR status and balance based on payments
CREATE OR REPLACE FUNCTION public.update_ar_ap_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.balance = NEW.amount - NEW.paid_amount;
  
  IF NEW.balance <= 0 THEN
    NEW.status = 'paid';
  ELSIF NEW.paid_amount > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'unpaid';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ap_status_trigger
BEFORE INSERT OR UPDATE ON public.accounts_payable
FOR EACH ROW
EXECUTE FUNCTION public.update_ar_ap_status();

CREATE TRIGGER update_ar_status_trigger
BEFORE INSERT OR UPDATE ON public.accounts_receivable
FOR EACH ROW
EXECUTE FUNCTION public.update_ar_ap_status();

-- Indexes for performance
CREATE INDEX idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_active ON public.chart_of_accounts(is_active);
CREATE INDEX idx_chart_of_accounts_parent ON public.chart_of_accounts(parent_account_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX idx_journal_entry_lines_journal ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_ap_status ON public.accounts_payable(status);
CREATE INDEX idx_ap_due_date ON public.accounts_payable(due_date);
CREATE INDEX idx_ar_status ON public.accounts_receivable(status);
CREATE INDEX idx_ar_due_date ON public.accounts_receivable(due_date);

-- Enable RLS
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view chart of accounts"
ON public.chart_of_accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Finance users can manage chart of accounts"
ON public.chart_of_accounts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Authenticated users can view journal entries"
ON public.journal_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Finance users can manage journal entries"
ON public.journal_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Users can view journal entry lines"
ON public.journal_entry_lines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Finance users can manage journal entry lines"
ON public.journal_entry_lines FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Users can view AP"
ON public.accounts_payable FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Finance users can manage AP"
ON public.accounts_payable FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Users can view AR"
ON public.accounts_receivable FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Finance users can manage AR"
ON public.accounts_receivable FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Users can view financial periods"
ON public.financial_periods FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Finance users can manage financial periods"
ON public.financial_periods FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- Insert default chart of accounts structure
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, description) VALUES
-- Assets
('1000', 'Assets', 'asset', 'Parent account for all assets'),
('1100', 'Current Assets', 'asset', 'Assets convertible to cash within one year'),
('1110', 'Cash and Bank', 'asset', 'Cash in hand and bank accounts'),
('1120', 'Accounts Receivable', 'asset', 'Money owed by customers'),
('1130', 'Inventory - Spare Parts', 'asset', 'Spare parts and supplies inventory'),
('1140', 'Prepaid Expenses', 'asset', 'Expenses paid in advance'),
('1200', 'Fixed Assets', 'asset', 'Long-term tangible assets'),
('1210', 'Vehicles - Buses', 'asset', 'Buses and other vehicles'),
('1220', 'Equipment', 'asset', 'Tools and equipment'),
('1230', 'Buildings', 'asset', 'Office and maintenance buildings'),
('1240', 'Accumulated Depreciation', 'asset', 'Accumulated depreciation on fixed assets'),

-- Liabilities
('2000', 'Liabilities', 'liability', 'Parent account for all liabilities'),
('2100', 'Current Liabilities', 'liability', 'Obligations due within one year'),
('2110', 'Accounts Payable', 'liability', 'Money owed to suppliers'),
('2120', 'Accrued Expenses', 'liability', 'Expenses incurred but not yet paid'),
('2130', 'Short-term Loans', 'liability', 'Loans payable within one year'),
('2140', 'Unearned Revenue', 'liability', 'Advance payments received'),
('2200', 'Long-term Liabilities', 'liability', 'Obligations due after one year'),
('2210', 'Vehicle Loans', 'liability', 'Long-term loans for vehicle purchases'),
('2220', 'Bank Loans', 'liability', 'Long-term bank loans'),

-- Equity
('3000', 'Equity', 'equity', 'Owner''s equity'),
('3100', 'Capital', 'equity', 'Owner''s invested capital'),
('3200', 'Retained Earnings', 'equity', 'Accumulated profits'),
('3300', 'Current Year Earnings', 'equity', 'Profit/loss for current year'),

-- Revenue
('4000', 'Revenue', 'revenue', 'Parent account for all revenue'),
('4100', 'Operating Revenue', 'revenue', 'Revenue from primary operations'),
('4110', 'Passenger Transport Revenue', 'revenue', 'Revenue from passenger transport services'),
('4120', 'Special Hire Revenue', 'revenue', 'Revenue from special hire services'),
('4130', 'School Bus Revenue', 'revenue', 'Revenue from school bus services'),
('4140', 'NSP Sales Revenue', 'revenue', 'Revenue from NSP sales'),
('4200', 'Other Income', 'revenue', 'Non-operating income'),
('4210', 'Interest Income', 'revenue', 'Interest earned'),
('4220', 'Miscellaneous Income', 'revenue', 'Other miscellaneous income'),

-- Expenses
('5000', 'Expenses', 'expense', 'Parent account for all expenses'),
('5100', 'Operating Expenses', 'expense', 'Direct operating costs'),
('5110', 'Fuel Costs', 'expense', 'Fuel and lubricants'),
('5120', 'Maintenance and Repairs', 'expense', 'Vehicle maintenance costs'),
('5130', 'Driver Salaries', 'expense', 'Driver salaries and wages'),
('5140', 'Conductor Salaries', 'expense', 'Conductor salaries and wages'),
('5150', 'Insurance Expense', 'expense', 'Vehicle and liability insurance'),
('5160', 'Permits and Licenses', 'expense', 'Route permits and licenses'),
('5170', 'Tyre and Tube', 'expense', 'Tyre and tube expenses'),
('5200', 'Administrative Expenses', 'expense', 'Overhead and admin costs'),
('5210', 'Office Salaries', 'expense', 'Office staff salaries'),
('5220', 'Office Rent', 'expense', 'Office rent expenses'),
('5230', 'Office Supplies', 'expense', 'Office supplies and stationery'),
('5240', 'Utilities', 'expense', 'Electricity, water, internet'),
('5250', 'Professional Fees', 'expense', 'Legal, accounting fees'),
('5300', 'Other Expenses', 'expense', 'Miscellaneous expenses'),
('5310', 'Depreciation Expense', 'expense', 'Depreciation on fixed assets'),
('5320', 'Interest Expense', 'expense', 'Interest on loans'),
('5330', 'Miscellaneous Expense', 'expense', 'Other miscellaneous expenses');

-- Set parent relationships
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '1000') WHERE account_code IN ('1100', '1200');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '1100') WHERE account_code IN ('1110', '1120', '1130', '1140');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '1200') WHERE account_code IN ('1210', '1220', '1230', '1240');

UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '2000') WHERE account_code IN ('2100', '2200');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '2100') WHERE account_code IN ('2110', '2120', '2130', '2140');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '2200') WHERE account_code IN ('2210', '2220');

UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '3000') WHERE account_code IN ('3100', '3200', '3300');

UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '4000') WHERE account_code IN ('4100', '4200');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '4100') WHERE account_code IN ('4110', '4120', '4130', '4140');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '4200') WHERE account_code IN ('4210', '4220');

UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '5000') WHERE account_code IN ('5100', '5200', '5300');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '5100') WHERE account_code IN ('5110', '5120', '5130', '5140', '5150', '5160', '5170');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '5200') WHERE account_code IN ('5210', '5220', '5230', '5240', '5250');
UPDATE public.chart_of_accounts SET parent_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '5300') WHERE account_code IN ('5310', '5320', '5330');