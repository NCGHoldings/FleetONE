
BEGIN;

-- Add the columns the UI expects (kept nullable to avoid breaking existing data)
ALTER TABLE public.yutong_bus_models
  ADD COLUMN IF NOT EXISTS bus_name text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS seating_capacity integer,
  ADD COLUMN IF NOT EXISTS engine text,
  ADD COLUMN IF NOT EXISTS manufactured_year integer,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS unit_price numeric;

-- Backfill new columns from existing data where possible
UPDATE public.yutong_bus_models
SET
  bus_name = COALESCE(bus_name, model_name),
  model = COALESCE(model, model_name),
  seating_capacity = COALESCE(seating_capacity, capacity),
  engine = COALESCE(engine, engine_type),
  unit_price = COALESCE(unit_price, base_price)
WHERE TRUE;

-- Helpful index for UI sorts/searches
CREATE INDEX IF NOT EXISTS yutong_bus_models_bus_name_idx ON public.yutong_bus_models (bus_name);

COMMIT;
