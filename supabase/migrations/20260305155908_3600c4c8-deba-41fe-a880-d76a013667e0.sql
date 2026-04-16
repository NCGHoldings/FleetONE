
-- Add new columns to petty_cash_funds
ALTER TABLE public.petty_cash_funds
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.school_branches(id),
  ADD COLUMN IF NOT EXISTS fund_limit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_balance_threshold numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fund_type text DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS approval_required_above numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;

-- Add new columns to petty_cash_transactions
ALTER TABLE public.petty_cash_transactions
  ADD COLUMN IF NOT EXISTS payee_name text,
  ADD COLUMN IF NOT EXISTS expense_category text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS voucher_number text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.school_branches(id),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS gl_account_id uuid REFERENCES public.chart_of_accounts(id);

-- Create sequence for petty cash vouchers
CREATE SEQUENCE IF NOT EXISTS petty_cash_voucher_seq START 1;

-- Create function to auto-generate voucher numbers
CREATE OR REPLACE FUNCTION public.generate_petty_cash_voucher_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('petty_cash_voucher_seq');
  RETURN 'PCV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

-- Create trigger to auto-set voucher number on insert
CREATE OR REPLACE FUNCTION public.set_petty_cash_voucher_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.voucher_number IS NULL OR NEW.voucher_number = '' THEN
    IF NEW.transaction_type = 'disbursement' THEN
      NEW.voucher_number := public.generate_petty_cash_voucher_number();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_petty_cash_voucher_number_trigger ON public.petty_cash_transactions;
CREATE TRIGGER set_petty_cash_voucher_number_trigger
  BEFORE INSERT ON public.petty_cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_petty_cash_voucher_number();

-- Create trigger to auto-update fund balance on transaction
CREATE OR REPLACE FUNCTION public.update_petty_cash_fund_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  SELECT current_balance INTO v_current_balance
  FROM public.petty_cash_funds
  WHERE id = NEW.petty_cash_fund_id;

  IF NEW.transaction_type = 'disbursement' THEN
    v_new_balance := v_current_balance - NEW.amount;
  ELSIF NEW.transaction_type = 'replenishment' THEN
    v_new_balance := v_current_balance + NEW.amount;
    -- Update last_replenished_at
    UPDATE public.petty_cash_funds
    SET last_replenished_at = NOW()
    WHERE id = NEW.petty_cash_fund_id;
  ELSE
    v_new_balance := v_current_balance;
  END IF;

  NEW.balance_after := v_new_balance;

  UPDATE public.petty_cash_funds
  SET current_balance = v_new_balance, updated_at = NOW()
  WHERE id = NEW.petty_cash_fund_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_petty_cash_fund_balance_trigger ON public.petty_cash_transactions;
CREATE TRIGGER update_petty_cash_fund_balance_trigger
  BEFORE INSERT ON public.petty_cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_petty_cash_fund_balance();

-- Index for branch filtering
CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_branch_id ON public.petty_cash_funds(branch_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_branch_id ON public.petty_cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_status ON public.petty_cash_transactions(status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_voucher ON public.petty_cash_transactions(voucher_number);
