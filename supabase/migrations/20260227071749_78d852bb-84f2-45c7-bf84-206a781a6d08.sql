
-- Create vendor_bank_accounts table
CREATE TABLE public.vendor_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  account_label TEXT DEFAULT 'Primary',
  bank_name TEXT NOT NULL,
  bank_branch TEXT,
  account_number TEXT NOT NULL,
  account_holder_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view vendor bank accounts" ON public.vendor_bank_accounts FOR SELECT USING (true);
CREATE POLICY "Users can insert vendor bank accounts" ON public.vendor_bank_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update vendor bank accounts" ON public.vendor_bank_accounts FOR UPDATE USING (true);
CREATE POLICY "Users can delete vendor bank accounts" ON public.vendor_bank_accounts FOR DELETE USING (true);

-- Add vendor_bank_account_id to ap_payments
ALTER TABLE public.ap_payments ADD COLUMN vendor_bank_account_id UUID REFERENCES public.vendor_bank_accounts(id);

-- Update company name
UPDATE public.companies SET name = 'NCG Holding (Pvt) Ltd' WHERE name = 'NCG Holding';
