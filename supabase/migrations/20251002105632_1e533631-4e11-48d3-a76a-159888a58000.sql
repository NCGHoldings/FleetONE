-- Fix search_path for newly created functions to address security warnings

-- Fix calculate_sla_due_date function
CREATE OR REPLACE FUNCTION public.calculate_sla_due_date(
  p_start_date timestamp with time zone,
  p_business_hours numeric DEFAULT 48
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_date date;
  v_hours_added numeric := 0;
  v_working_hours_per_day numeric := 8;
  v_result timestamp with time zone;
BEGIN
  v_current_date := p_start_date::date;
  v_result := p_start_date;
  
  WHILE v_hours_added < p_business_hours LOOP
    v_current_date := v_current_date + interval '1 day';
    
    IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE holiday_date = v_current_date
      ) THEN
        v_hours_added := v_hours_added + v_working_hours_per_day;
        v_result := v_current_date::timestamp with time zone + time '17:00:00';
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Fix set_feedback_sla_due_date function
CREATE OR REPLACE FUNCTION public.set_feedback_sla_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.sla_due_date IS NULL THEN
    NEW.sla_due_date := public.calculate_sla_due_date(NEW.created_at, 48);
  END IF;
  RETURN NEW;
END;
$$;