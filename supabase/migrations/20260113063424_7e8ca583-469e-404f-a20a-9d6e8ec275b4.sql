-- Create function to generate next version number for light vehicle quotations
CREATE OR REPLACE FUNCTION generate_next_lightvehicle_version_number(p_parent_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM lightvehicle_quotations
  WHERE parent_quotation_id = p_parent_id OR id = p_parent_id;
  
  RETURN '1.' || v_count;
END;
$$ LANGUAGE plpgsql;