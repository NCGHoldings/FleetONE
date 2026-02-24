-- Fix security warning: Add search_path to calculate_income_from_details
CREATE OR REPLACE FUNCTION public.calculate_income_from_details(details jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF details IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE((details->>'bus_collection')::NUMERIC, 0) +
         COALESCE((details->>'call_booking')::NUMERIC, 0) +
         COALESCE((details->>'agent_booking')::NUMERIC, 0) +
         COALESCE((details->>'luggage_income')::NUMERIC, 0) +
         COALESCE((details->>'miscellaneous_income')::NUMERIC, 0) +
         COALESCE((details->>'others')::NUMERIC, 0);
END;
$function$;

-- Fix security warning: Add search_path to calculate_expenses_from_details
CREATE OR REPLACE FUNCTION public.calculate_expenses_from_details(details jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF details IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE((details->>'fuel')::NUMERIC, 0) +
         COALESCE((details->>'repair')::NUMERIC, 0) +
         COALESCE((details->>'tyre_tube')::NUMERIC, 0) +
         COALESCE((details->>'salary')::NUMERIC, 0) +
         COALESCE((details->>'police')::NUMERIC, 0) +
         COALESCE((details->>'food')::NUMERIC, 0) +
         COALESCE((details->>'emission_fitness')::NUMERIC, 0) +
         COALESCE((details->>'permits_renewal')::NUMERIC, 0) +
         COALESCE((details->>'staff_accommodation')::NUMERIC, 0) +
         COALESCE((details->>'highway_charges')::NUMERIC, 0) +
         COALESCE((details->>'accident_compensation')::NUMERIC, 0) +
         COALESCE((details->>'parking')::NUMERIC, 0) +
         COALESCE((details->>'log_sheet')::NUMERIC, 0) +
         COALESCE((details->>'vehicle_hire')::NUMERIC, 0) +
         COALESCE((details->>'ntc')::NUMERIC, 0) +
         COALESCE((details->>'runner')::NUMERIC, 0) +
         COALESCE((details->>'short_misc')::NUMERIC, 0) +
         COALESCE((details->>'temporary_permit')::NUMERIC, 0) +
         COALESCE((details->>'body_wash')::NUMERIC, 0) +
         COALESCE((details->>'legal_court')::NUMERIC, 0) +
         COALESCE((details->>'other')::NUMERIC, 0);
END;
$function$;