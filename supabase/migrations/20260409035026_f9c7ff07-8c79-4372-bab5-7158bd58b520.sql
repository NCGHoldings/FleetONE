ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ar_receipts ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;