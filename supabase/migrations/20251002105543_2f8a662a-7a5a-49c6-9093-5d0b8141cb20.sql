-- Add new fields to feedback_complaints table for enhanced management
ALTER TABLE public.feedback_complaints
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to_name text,
ADD COLUMN IF NOT EXISTS action_taken text,
ADD COLUMN IF NOT EXISTS related_persons jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sla_due_date timestamp with time zone;

-- Add comment for related_persons structure
COMMENT ON COLUMN public.feedback_complaints.related_persons IS 'Array of objects with name and role fields: [{"name": "John Doe", "role": "Driver"}]';

-- Create holidays table for SLA calculation
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL UNIQUE,
  holiday_name text NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on holidays table
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS policies for holidays
CREATE POLICY "All authenticated users can view holidays"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Function to calculate business days SLA (48 business hours = 6 business days)
CREATE OR REPLACE FUNCTION public.calculate_sla_due_date(
  p_start_date timestamp with time zone,
  p_business_hours numeric DEFAULT 48
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_date date;
  v_hours_added numeric := 0;
  v_working_hours_per_day numeric := 8; -- 8 hours per business day
  v_result timestamp with time zone;
BEGIN
  v_current_date := p_start_date::date;
  v_result := p_start_date;
  
  WHILE v_hours_added < p_business_hours LOOP
    -- Move to next day
    v_current_date := v_current_date + interval '1 day';
    
    -- Check if it's a weekend (Saturday=6, Sunday=0)
    IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
      -- Check if it's not a holiday
      IF NOT EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE holiday_date = v_current_date
      ) THEN
        -- Add working hours for this business day
        v_hours_added := v_hours_added + v_working_hours_per_day;
        v_result := v_current_date::timestamp with time zone + time '17:00:00'; -- End of business day
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Update existing records to set SLA due dates
UPDATE public.feedback_complaints
SET sla_due_date = public.calculate_sla_due_date(created_at, 48)
WHERE sla_due_date IS NULL;

-- Create trigger to automatically set SLA due date on insert
CREATE OR REPLACE FUNCTION public.set_feedback_sla_due_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sla_due_date IS NULL THEN
    NEW.sla_due_date := public.calculate_sla_due_date(NEW.created_at, 48);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_sla_due_date_trigger
  BEFORE INSERT ON public.feedback_complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_feedback_sla_due_date();

-- Insert some common Sri Lankan holidays
INSERT INTO public.holidays (holiday_date, holiday_name, is_recurring) VALUES
  ('2025-01-01', 'New Year''s Day', true),
  ('2025-02-04', 'Independence Day', true),
  ('2025-04-14', 'Sinhala & Tamil New Year', true),
  ('2025-05-01', 'May Day', true),
  ('2025-12-25', 'Christmas Day', true)
ON CONFLICT (holiday_date) DO NOTHING;