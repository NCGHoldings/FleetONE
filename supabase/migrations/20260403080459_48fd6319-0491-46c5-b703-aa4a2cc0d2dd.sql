-- Add journal_entry_id and business_unit_code to landed_cost_vouchers
ALTER TABLE public.landed_cost_vouchers 
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id),
  ADD COLUMN IF NOT EXISTS business_unit_code text;

-- Add vendor_id to landed_cost_charges
ALTER TABLE public.landed_cost_charges 
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id);

-- Add index for business unit filtering
CREATE INDEX IF NOT EXISTS idx_landed_cost_vouchers_business_unit 
  ON public.landed_cost_vouchers(business_unit_code);

-- Add index for journal entry lookups
CREATE INDEX IF NOT EXISTS idx_landed_cost_vouchers_journal_entry 
  ON public.landed_cost_vouchers(journal_entry_id);