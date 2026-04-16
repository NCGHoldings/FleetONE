-- Add payment_amount and payment_date to school_receipts table
ALTER TABLE public.school_receipts 
ADD COLUMN payment_amount numeric,
ADD COLUMN payment_date date;

-- Add comment explaining the columns
COMMENT ON COLUMN public.school_receipts.payment_amount IS 'Amount paid by parent as indicated on receipt';
COMMENT ON COLUMN public.school_receipts.payment_date IS 'Date of payment as shown on receipt';