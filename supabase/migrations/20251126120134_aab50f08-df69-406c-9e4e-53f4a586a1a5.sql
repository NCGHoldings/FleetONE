-- Create function to sync tyre mileage when bus mileage updates
CREATE OR REPLACE FUNCTION public.sync_bus_tyre_mileage()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Only proceed if current_mileage actually changed
  IF NEW.current_mileage IS DISTINCT FROM OLD.current_mileage THEN
    -- Update all active tyres for this bus
    UPDATE public.bus_tyres
    SET 
      current_km = NEW.current_mileage,
      condition_percentage = public.calculate_tyre_condition(id),
      updated_at = now()
    WHERE bus_id = NEW.id 
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on buses table
CREATE TRIGGER trigger_sync_tyre_on_mileage_update
  AFTER UPDATE OF current_mileage ON public.buses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bus_tyre_mileage();

-- Add manual sync function for all buses
CREATE OR REPLACE FUNCTION public.sync_all_tyre_conditions()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Update all active tyres with current bus mileage
  UPDATE public.bus_tyres bt
  SET 
    current_km = b.current_mileage,
    condition_percentage = public.calculate_tyre_condition(bt.id),
    updated_at = now()
  FROM public.buses b
  WHERE bt.bus_id = b.id 
    AND bt.status = 'active';
END;
$$;