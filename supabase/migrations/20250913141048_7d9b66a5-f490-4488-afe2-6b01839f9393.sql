-- Create table for public special hire submissions
CREATE TABLE public.special_hire_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Customer Details
  company_name text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  special_request text,
  
  -- Trip Details
  hire_type text NOT NULL DEFAULT 'Outside',
  number_of_buses integer NOT NULL DEFAULT 1,
  pickup_location text NOT NULL,
  drop_location text NOT NULL,
  number_of_passengers integer NOT NULL,
  pickup_datetime timestamp with time zone NOT NULL,
  drop_datetime timestamp with time zone NOT NULL,
  
  -- Submission tracking
  submission_status text NOT NULL DEFAULT 'pending', -- pending, selected, processed
  selected_by uuid,
  selected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Reference ID for customer tracking
  submission_no text NOT NULL DEFAULT 'SH-' || to_char(now(), 'YYYY') || '-' || lpad(extract(epoch from now())::text, 8, '0')
);

-- Enable RLS
ALTER TABLE public.special_hire_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow anonymous submissions" 
ON public.special_hire_submissions 
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Staff can view submissions" 
ON public.special_hire_submissions 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Staff can update submissions" 
ON public.special_hire_submissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create index for performance
CREATE INDEX idx_special_hire_submissions_status ON public.special_hire_submissions(submission_status);
CREATE INDEX idx_special_hire_submissions_created ON public.special_hire_submissions(created_at DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_special_hire_submissions_updated_at
BEFORE UPDATE ON public.special_hire_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();