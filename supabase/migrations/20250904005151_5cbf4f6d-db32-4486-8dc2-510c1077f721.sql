-- Add parking_location_id to special_hire_quotations table
ALTER TABLE special_hire_quotations 
ADD COLUMN parking_location_id uuid REFERENCES fuel_settings(id);

-- Update existing quotations to use the default parking location
UPDATE special_hire_quotations 
SET parking_location_id = (
  SELECT id FROM fuel_settings WHERE is_default = true LIMIT 1
) 
WHERE parking_location_id IS NULL;