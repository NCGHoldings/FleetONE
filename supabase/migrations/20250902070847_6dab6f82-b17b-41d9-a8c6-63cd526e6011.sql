
BEGIN;

-- 1) Create the table (idempotent)
CREATE TABLE IF NOT EXISTS public.yutong_bus_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  engine TEXT,
  manufactured_year INTEGER,
  condition TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Ensure required columns exist (for previously created tables with different columns)
ALTER TABLE public.yutong_bus_models
  ADD COLUMN IF NOT EXISTS bus_name TEXT,
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS engine TEXT,
  ADD COLUMN IF NOT EXISTS manufactured_year INTEGER,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3) Backfill from legacy columns if they exist (safe, conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'yutong_bus_models' AND column_name = 'model'
  ) THEN
    EXECUTE 'UPDATE public.yutong_bus_models SET model_name = COALESCE(model_name, model)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'yutong_bus_models' AND column_name = 'seating_capacity'
  ) THEN
    EXECUTE 'UPDATE public.yutong_bus_models SET capacity = COALESCE(capacity, seating_capacity)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'yutong_bus_models' AND column_name = 'unit_price'
  ) THEN
    EXECUTE 'UPDATE public.yutong_bus_models SET base_price = COALESCE(base_price, unit_price)';
  END IF;
END $$;

-- 4) Enable Row Level Security
ALTER TABLE public.yutong_bus_models ENABLE ROW LEVEL SECURITY;

-- 5) Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'yutong_bus_models' 
      AND policyname = 'All authenticated users can view yutong bus models'
  ) THEN
    CREATE POLICY "All authenticated users can view yutong bus models"
      ON public.yutong_bus_models
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'yutong_bus_models' 
      AND policyname = 'Staff can manage yutong bus models'
  ) THEN
    CREATE POLICY "Staff can manage yutong bus models"
      ON public.yutong_bus_models
      FOR ALL
      USING (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
      )
      WITH CHECK (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
      );
  END IF;
END $$;

-- 6) Trigger to auto-update updated_at (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_yutong_bus_models_updated_at'
  ) THEN
    CREATE TRIGGER update_yutong_bus_models_updated_at
    BEFORE UPDATE ON public.yutong_bus_models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 7) Helpful indexes
CREATE INDEX IF NOT EXISTS yutong_bus_models_bus_name_idx ON public.yutong_bus_models (bus_name);
CREATE INDEX IF NOT EXISTS yutong_bus_models_model_name_idx ON public.yutong_bus_models (model_name);
CREATE INDEX IF NOT EXISTS yutong_bus_models_is_active_idx ON public.yutong_bus_models (is_active);

COMMIT;
