ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS revenue_amount numeric,
  ADD COLUMN IF NOT EXISTS insurance_month text,
  ADD COLUMN IF NOT EXISTS documents_status text,
  ADD COLUMN IF NOT EXISTS import_raw_data jsonb;