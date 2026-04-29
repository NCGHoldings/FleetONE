-- Add reimbursement_ap_payment_id to link petty cash transactions to the AP payment that reimbursed them
ALTER TABLE public.petty_cash_transactions
ADD COLUMN IF NOT EXISTS reimbursement_ap_payment_id UUID REFERENCES public.ap_payments(id);

-- Add an index for performance
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_reimbursement 
ON public.petty_cash_transactions(reimbursement_ap_payment_id);
