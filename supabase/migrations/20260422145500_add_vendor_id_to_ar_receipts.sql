ALTER TABLE public.ar_receipts ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_vendor_id ON public.ar_receipts(vendor_id);
