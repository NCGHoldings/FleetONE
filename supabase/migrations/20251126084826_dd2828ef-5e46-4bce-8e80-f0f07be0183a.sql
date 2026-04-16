-- Add odometer_source column to real_time_tracking table
ALTER TABLE real_time_tracking 
ADD COLUMN IF NOT EXISTS odometer_source TEXT DEFAULT 'manual';

COMMENT ON COLUMN real_time_tracking.odometer_source IS 'Source of odometer data: fios (direct sensor), gps_calculated (GPS waypoints), or manual';