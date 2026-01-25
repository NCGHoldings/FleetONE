-- Add dedicated columns for time-based charges
ALTER TABLE special_hire_quotations 
ADD COLUMN IF NOT EXISTS overtime_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overnight_charge NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exceeding_distance_charge NUMERIC DEFAULT 0;