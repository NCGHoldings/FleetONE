-- Add bank_account_id to customer_categories for modular finance routing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_categories' AND column_name = 'bank_account_id') THEN
        ALTER TABLE public.customer_categories ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id);
    END IF;
END $$;

-- Update comment for clarity
COMMENT ON COLUMN public.customer_categories.bank_account_id IS 'Specific bank account where payments for this category should be directed by default.';
