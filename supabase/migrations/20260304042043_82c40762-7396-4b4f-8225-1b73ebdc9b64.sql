-- Make quotation_id nullable so orders can be added directly from spreadsheet
ALTER TABLE public.yutong_orders ALTER COLUMN quotation_id DROP NOT NULL;

-- Make order_no auto-generated (trigger already exists via set_yutong_order_no)
-- Make unit_price have a default
ALTER TABLE public.yutong_orders ALTER COLUMN unit_price SET DEFAULT 0;

-- Notify PostgREST to reload schema (picks up vehicle_year from previous migration too)
NOTIFY pgrst, 'reload schema';