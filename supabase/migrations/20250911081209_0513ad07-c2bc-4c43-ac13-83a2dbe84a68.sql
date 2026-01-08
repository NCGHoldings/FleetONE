-- Add maintenance rate field to fuel_settings table
ALTER TABLE public.fuel_settings 
ADD COLUMN maintenance_rate_lkr_per_km numeric DEFAULT 20.0;