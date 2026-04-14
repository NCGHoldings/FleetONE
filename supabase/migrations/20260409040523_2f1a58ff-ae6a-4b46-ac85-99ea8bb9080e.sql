
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES public.buses(id);
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS bus_no TEXT;
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

ALTER TABLE public.ar_receipts ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES public.buses(id);
ALTER TABLE public.ar_receipts ADD COLUMN IF NOT EXISTS bus_no TEXT;
ALTER TABLE public.ar_receipts ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
