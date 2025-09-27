-- Add versioning fields to special_hire_quotations table
ALTER TABLE special_hire_quotations 
ADD COLUMN parent_quotation_id UUID REFERENCES special_hire_quotations(id),
ADD COLUMN version_number TEXT DEFAULT '1.0',
ADD COLUMN edit_type TEXT CHECK (edit_type IN ('staff_edit', 'customer_request')),
ADD COLUMN edit_reason TEXT,
ADD COLUMN is_active_version BOOLEAN DEFAULT true;

-- Create index for better performance when querying versions
CREATE INDEX idx_special_hire_quotations_parent_id ON special_hire_quotations(parent_quotation_id);
CREATE INDEX idx_special_hire_quotations_version ON special_hire_quotations(parent_quotation_id, version_number);
CREATE INDEX idx_special_hire_quotations_active ON special_hire_quotations(is_active_version);

-- Function to generate next version number
CREATE OR REPLACE FUNCTION generate_next_version_number(p_parent_id UUID)
RETURNS TEXT AS $$
DECLARE
  latest_version TEXT;
  major_version INTEGER;
  minor_version INTEGER;
BEGIN
  -- Get the latest version number for this quotation family
  SELECT version_number INTO latest_version
  FROM special_hire_quotations 
  WHERE (id = p_parent_id OR parent_quotation_id = p_parent_id)
  ORDER BY 
    CAST(split_part(version_number, '.', 1) AS INTEGER) DESC,
    CAST(split_part(version_number, '.', 2) AS INTEGER) DESC
  LIMIT 1;
  
  -- If no version found, start with 1.0
  IF latest_version IS NULL THEN
    RETURN '1.0';
  END IF;
  
  -- Parse current version
  major_version := CAST(split_part(latest_version, '.', 1) AS INTEGER);
  minor_version := CAST(split_part(latest_version, '.', 2) AS INTEGER);
  
  -- Increment minor version
  minor_version := minor_version + 1;
  
  RETURN major_version || '.' || minor_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;