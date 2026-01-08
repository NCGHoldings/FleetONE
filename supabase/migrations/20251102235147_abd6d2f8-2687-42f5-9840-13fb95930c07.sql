-- Fix search_path for update_active_seasonal_themes function
CREATE OR REPLACE FUNCTION update_active_seasonal_themes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First, set all themes to inactive
  UPDATE seasonal_themes
  SET is_active = false
  WHERE true;

  -- Then activate themes that should be active
  UPDATE seasonal_themes
  SET is_active = true
  WHERE is_enabled = true
    AND CURRENT_DATE BETWEEN start_date AND end_date;
END;
$$;