-- Migration: Fleet Data Bridge (Route Master Config -> Fleet Master Roster)

CREATE OR REPLACE FUNCTION sync_route_master_to_roster()
RETURNS TRIGGER AS $$
DECLARE
  v_revenue_target NUMERIC;
  v_default_driver TEXT;
  v_default_conductor TEXT;
BEGIN
  -- Extract values from master_config JSONB safely
  IF NEW.master_config IS NOT NULL THEN
    v_revenue_target := (NEW.master_config->>'revenue_target')::NUMERIC;
    v_default_driver := NEW.master_config->>'default_driver';
    v_default_conductor := NEW.master_config->>'default_conductor';
    
    -- Update all active roster entries mapped to this route
    UPDATE public.fleet_master_roster
    SET 
      day_target = COALESCE(v_revenue_target, day_target),
      default_driver = COALESCE(v_default_driver, default_driver),
      default_conductor = COALESCE(v_default_conductor, default_conductor)
    WHERE route_id = NEW.id AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_route_master_to_roster ON public.routes;

-- Create the trigger
CREATE TRIGGER trg_sync_route_master_to_roster
AFTER UPDATE ON public.routes
FOR EACH ROW
WHEN (OLD.master_config IS DISTINCT FROM NEW.master_config)
EXECUTE FUNCTION sync_route_master_to_roster();

