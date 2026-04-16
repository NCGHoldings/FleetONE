
-- ============ Bank Fee Charges Table ============
CREATE TABLE public.bank_fee_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  fee_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'bank_charge',
  description TEXT,
  ap_payment_id UUID REFERENCES public.ap_payments(id),
  ar_receipt_id UUID REFERENCES public.ar_receipts(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  bank_transaction_id UUID REFERENCES public.bank_transactions(id),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_fee_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.bank_fee_charges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ Cheque Register Enhancements ============
-- Add cheque_type for AR/AP distinction
ALTER TABLE public.cheque_register
  ADD COLUMN IF NOT EXISTS cheque_type TEXT DEFAULT 'outgoing',
  ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES public.ar_receipts(id),
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS memo TEXT;
