-- Add manual trip distance override columns to special_hire_quotations
ALTER TABLE special_hire_quotations
ADD COLUMN IF NOT EXISTS uses_manual_trip_distance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_km_trip numeric DEFAULT 0;