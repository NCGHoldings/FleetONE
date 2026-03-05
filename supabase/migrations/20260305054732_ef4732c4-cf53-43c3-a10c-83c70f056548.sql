
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS bank_fee_amount NUMERIC DEFAULT 0;
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS bank_fee_type TEXT;
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS total_with_fees NUMERIC GENERATED ALWAYS AS (amount + COALESCE(bank_fee_amount, 0)) STORED;
