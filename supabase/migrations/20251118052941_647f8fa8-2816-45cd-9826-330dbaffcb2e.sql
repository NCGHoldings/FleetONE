-- Fix security issue: Set secure search_path for update function
CREATE OR REPLACE FUNCTION update_trip_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';