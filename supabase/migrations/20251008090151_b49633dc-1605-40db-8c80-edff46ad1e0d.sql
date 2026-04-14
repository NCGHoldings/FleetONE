-- Create enum for customization option types
CREATE TYPE yutong_customization_type AS ENUM (
  'seat_colour',
  'curtain_colour',
  'body_colour',
  'headrest_logo'
);

-- Create table for customization options
CREATE TABLE public.yutong_customization_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type yutong_customization_type NOT NULL,
  option_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add customization columns to yutong_quotations
ALTER TABLE public.yutong_quotations 
ADD COLUMN seat_colour TEXT,
ADD COLUMN curtain_colour TEXT,
ADD COLUMN body_colour TEXT,
ADD COLUMN seat_headrest_logo TEXT;

-- Enable RLS
ALTER TABLE public.yutong_customization_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customization options
CREATE POLICY "All authenticated users can view customization options"
ON public.yutong_customization_options
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage customization options"
ON public.yutong_customization_options
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_yutong_customization_options_updated_at
BEFORE UPDATE ON public.yutong_customization_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default options
INSERT INTO public.yutong_customization_options (option_type, option_value, display_order) VALUES
  ('seat_colour', 'Black', 1),
  ('seat_colour', 'Grey', 2),
  ('seat_colour', 'Blue', 3),
  ('seat_colour', 'Red', 4),
  ('curtain_colour', 'Beige', 1),
  ('curtain_colour', 'Grey', 2),
  ('curtain_colour', 'Blue', 3),
  ('body_colour', 'White', 1),
  ('body_colour', 'Red', 2),
  ('body_colour', 'Blue', 3),
  ('body_colour', 'Yellow', 4),
  ('headrest_logo', 'Standard Logo', 1),
  ('headrest_logo', 'Custom Logo', 2),
  ('headrest_logo', 'No Logo', 3);