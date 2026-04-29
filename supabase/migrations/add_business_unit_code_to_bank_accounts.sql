-- Add business_unit_code to bank_accounts table
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS business_unit_code text;

-- Optional: Add an index if we query by this often
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_unit_code 
ON public.bank_accounts(business_unit_code);

-- Grant permissions if necessary (usually handled by RLS, but ensuring table structure is correct)
-- Refresh PostgREST schema cache (Supabase automatically does this when using the dashboard)
NOTIFY pgrst, 'reload schema';
