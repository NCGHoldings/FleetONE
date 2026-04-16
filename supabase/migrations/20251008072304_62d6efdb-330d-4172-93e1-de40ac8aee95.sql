-- Create enum for position types (optional, for future use)
-- Create table for responsible persons
CREATE TABLE public.yutong_responsible_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add responsible_person_id column to yutong_quotations
ALTER TABLE public.yutong_quotations 
ADD COLUMN responsible_person_id UUID REFERENCES public.yutong_responsible_persons(id);

-- Enable Row Level Security
ALTER TABLE public.yutong_responsible_persons ENABLE ROW LEVEL SECURITY;

-- Create policies for yutong_responsible_persons
CREATE POLICY "All authenticated users can view responsible persons"
ON public.yutong_responsible_persons
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage responsible persons"
ON public.yutong_responsible_persons
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_yutong_responsible_persons_updated_at
BEFORE UPDATE ON public.yutong_responsible_persons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default responsible person (optional)
INSERT INTO public.yutong_responsible_persons (name, phone, email, position, is_default, is_active)
VALUES ('Sales Manager', '+94 77 123 4567', 'sales@yutong.lk', 'Sales Manager', true, true);