-- Fix odometer_reading column type to accept decimal values from FIOS
ALTER TABLE gps_location_history 
  ALTER COLUMN odometer_reading TYPE NUMERIC USING odometer_reading::NUMERIC;

-- Add comment for clarity
COMMENT ON COLUMN gps_location_history.odometer_reading IS 'Odometer reading in kilometers (decimal values from FIOS GPS sensors)';