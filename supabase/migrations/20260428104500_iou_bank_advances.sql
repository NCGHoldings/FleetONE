-- Add bank_account_id to iou_records
ALTER TABLE public.iou_records
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id);

-- Create an index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_iou_records_bank_account_id ON public.iou_records(bank_account_id);
