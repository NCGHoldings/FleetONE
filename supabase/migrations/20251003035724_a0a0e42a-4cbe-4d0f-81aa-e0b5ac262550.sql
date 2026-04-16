-- Update SLA calculation to treat 48 business hours as 2 working days
-- Business hours are counted as 24 hours per working day (not just 8-hour workdays)

CREATE OR REPLACE FUNCTION public.calculate_sla_due_date(
  p_start_date timestamp with time zone,
  p_business_hours numeric DEFAULT 48
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_date date;
  v_days_to_add numeric;
  v_days_added integer := 0;
  v_result timestamp with time zone;
BEGIN
  -- Convert business hours to working days (48 hours = 2 working days)
  v_days_to_add := CEIL(p_business_hours / 24.0);
  v_current_date := p_start_date::date;
  v_result := p_start_date;
  
  -- Add working days, skipping weekends and holidays
  WHILE v_days_added < v_days_to_add LOOP
    v_current_date := v_current_date + interval '1 day';
    
    -- Check if it's a working day (not weekend, not holiday)
    IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE holiday_date = v_current_date
      ) THEN
        v_days_added := v_days_added + 1;
        v_result := v_current_date::timestamp with time zone + (p_start_date::time);
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_result;
END;
$function$;

-- Recalculate SLA due dates for all unresolved feedback/complaints
UPDATE public.feedback_complaints
SET sla_due_date = public.calculate_sla_due_date(created_at, 48)
WHERE status NOT IN ('resolved', 'closed');