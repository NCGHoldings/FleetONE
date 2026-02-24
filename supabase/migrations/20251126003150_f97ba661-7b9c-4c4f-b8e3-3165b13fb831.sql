-- Add odometer and mileage tracking fields to real_time_tracking table
ALTER TABLE real_time_tracking 
ADD COLUMN IF NOT EXISTS heading_degrees INTEGER,
ADD COLUMN IF NOT EXISTS altitude_meters DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS satellite_count INTEGER,
ADD COLUMN IF NOT EXISTS fios_device_id INTEGER,
ADD COLUMN IF NOT EXISTS odometer_km DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS daily_mileage_km DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS engine_hours DECIMAL(10,2);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_real_time_tracking_bus_date ON real_time_tracking(bus_id, last_update DESC);

COMMENT ON COLUMN real_time_tracking.heading_degrees IS 'Direction of travel in degrees (0-360)';
COMMENT ON COLUMN real_time_tracking.altitude_meters IS 'Altitude above sea level in meters';
COMMENT ON COLUMN real_time_tracking.satellite_count IS 'Number of GPS satellites in view (signal quality)';
COMMENT ON COLUMN real_time_tracking.fios_device_id IS 'FIOS/Wialon device ID for reference';
COMMENT ON COLUMN real_time_tracking.odometer_km IS 'Current odometer reading in kilometers';
COMMENT ON COLUMN real_time_tracking.daily_mileage_km IS 'Distance traveled today in kilometers';
COMMENT ON COLUMN real_time_tracking.engine_hours IS 'Total engine running hours';