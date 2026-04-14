-- Add fuel_level_liters column to real_time_tracking table
ALTER TABLE real_time_tracking 
ADD COLUMN IF NOT EXISTS fuel_level_liters NUMERIC;

COMMENT ON COLUMN real_time_tracking.fuel_level_liters IS 'Fuel level in liters from FIOS sensor';