ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS vehicle_name text,
  ADD COLUMN IF NOT EXISTS vehicle_brand text,
  ADD COLUMN IF NOT EXISTS permit_no text,
  ADD COLUMN IF NOT EXISTS permit_category text,
  ADD COLUMN IF NOT EXISTS leasing_bank text,
  ADD COLUMN IF NOT EXISTS leasing_end_date date,
  ADD COLUMN IF NOT EXISTS permit_expiry_date date,
  ADD COLUMN IF NOT EXISTS insurance_company text,
  ADD COLUMN IF NOT EXISTS default_driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text;