-- Add time adjustment fields to special_hire_trip_adjustments table
ALTER TABLE special_hire_trip_adjustments 
ADD COLUMN IF NOT EXISTS original_pickup_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_drop_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_pickup_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_drop_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_overtime_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_overnight_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_overtime_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_overnight_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_charge_adjustment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overnight_charge_adjustment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_time_adjustment NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN special_hire_trip_adjustments.original_pickup_datetime IS 'Originally quoted pickup time';
COMMENT ON COLUMN special_hire_trip_adjustments.original_drop_datetime IS 'Originally quoted drop time';
COMMENT ON COLUMN special_hire_trip_adjustments.actual_pickup_datetime IS 'Actual pickup time after trip completion';
COMMENT ON COLUMN special_hire_trip_adjustments.actual_drop_datetime IS 'Actual drop time after trip completion';
COMMENT ON COLUMN special_hire_trip_adjustments.original_hours IS 'Trip duration from quoted times';
COMMENT ON COLUMN special_hire_trip_adjustments.actual_hours IS 'Trip duration from actual times';
COMMENT ON COLUMN special_hire_trip_adjustments.extra_hours IS 'Hours exceeding available hours based on distance';
COMMENT ON COLUMN special_hire_trip_adjustments.overtime_charge_adjustment IS 'Difference between actual and original overtime charges';
COMMENT ON COLUMN special_hire_trip_adjustments.overnight_charge_adjustment IS 'Difference between actual and original overnight charges';
COMMENT ON COLUMN special_hire_trip_adjustments.total_time_adjustment IS 'Total time-based adjustment amount';