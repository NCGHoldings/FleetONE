-- Change capacity column from integer to text to support string values like "49 seats"
ALTER TABLE public.yutong_bus_models 
ALTER COLUMN capacity TYPE TEXT;