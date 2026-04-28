-- Add petty_cash_fund_id and settlement_type to iou_records
ALTER TABLE public.iou_records
ADD COLUMN IF NOT EXISTS petty_cash_fund_id UUID REFERENCES public.petty_cash_funds(id),
ADD COLUMN IF NOT EXISTS settlement_type TEXT CHECK (settlement_type IN ('expense', 'cash_return', 'mixed'));

-- Create an index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_iou_records_petty_cash_fund_id ON public.iou_records(petty_cash_fund_id);
