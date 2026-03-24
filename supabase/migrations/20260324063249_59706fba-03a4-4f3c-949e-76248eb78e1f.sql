ALTER TABLE public.yutong_orders ADD COLUMN IF NOT EXISTS customer_category_id UUID REFERENCES public.customer_categories(id);
ALTER TABLE public.sinotruck_orders ADD COLUMN IF NOT EXISTS customer_category_id UUID REFERENCES public.customer_categories(id);
ALTER TABLE public.lightvehicle_orders ADD COLUMN IF NOT EXISTS customer_category_id UUID REFERENCES public.customer_categories(id);
CREATE INDEX IF NOT EXISTS idx_yutong_orders_customer_category_id ON public.yutong_orders(customer_category_id);
CREATE INDEX IF NOT EXISTS idx_sinotruck_orders_customer_category_id ON public.sinotruck_orders(customer_category_id);
CREATE INDEX IF NOT EXISTS idx_lightvehicle_orders_customer_category_id ON public.lightvehicle_orders(customer_category_id);