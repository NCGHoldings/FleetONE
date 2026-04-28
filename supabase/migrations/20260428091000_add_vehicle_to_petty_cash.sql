-- Add vehicle_no to petty_cash_transactions to support vehicle-tagged petty cash disbursements
ALTER TABLE public.petty_cash_transactions 
ADD COLUMN IF NOT EXISTS vehicle_no TEXT;

-- Index for searching expenses by vehicle
CREATE INDEX IF NOT EXISTS idx_petty_cash_txn_vehicle ON public.petty_cash_transactions(vehicle_no);
