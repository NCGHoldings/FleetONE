-- Add additional FIOS tracking columns to real_time_tracking table
ALTER TABLE real_time_tracking 
ADD COLUMN IF NOT EXISTS battery_voltage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS gsm_signal_strength INTEGER,
ADD COLUMN IF NOT EXISTS ignition_status BOOLEAN,
ADD COLUMN IF NOT EXISTS gps_accuracy DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS alarm_active BOOLEAN;

-- Add comments for new columns
COMMENT ON COLUMN real_time_tracking.battery_voltage IS 'External battery voltage from FIOS (pwr_ext)';
COMMENT ON COLUMN real_time_tracking.gsm_signal_strength IS 'GSM signal strength from FIOS';
COMMENT ON COLUMN real_time_tracking.ignition_status IS 'Ignition ON/OFF status from FIOS (state_flag or io_69)';
COMMENT ON COLUMN real_time_tracking.gps_accuracy IS 'GPS accuracy (HDOP) from FIOS';
COMMENT ON COLUMN real_time_tracking.alarm_active IS 'Security alarm status from FIOS';

-- Create index for ignition status queries (for engine hours tracking)
CREATE INDEX IF NOT EXISTS idx_real_time_tracking_ignition 
ON real_time_tracking(bus_id, ignition_status, last_update);

-- Create index for battery voltage alerts
CREATE INDEX IF NOT EXISTS idx_real_time_tracking_battery 
ON real_time_tracking(battery_voltage) 
WHERE battery_voltage IS NOT NULL AND battery_voltage < 12.0;