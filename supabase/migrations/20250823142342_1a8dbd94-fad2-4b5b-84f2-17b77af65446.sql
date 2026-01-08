-- Update daily_trips table to support all required fields and features
ALTER TABLE public.daily_trips 
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS diesel_price_per_liter numeric(10,2),
ADD COLUMN IF NOT EXISTS fuel_cost numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses_details jsonb,
ADD COLUMN IF NOT EXISTS total_expenses numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_income numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_score numeric(5,2),
ADD COLUMN IF NOT EXISTS audit_log jsonb DEFAULT '[]'::jsonb;

-- Create expense types table for admin management
CREATE TABLE IF NOT EXISTS public.expense_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;

-- Create policies for expense types
CREATE POLICY "All authenticated users can view expense types" 
ON public.expense_types 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage expense types" 
ON public.expense_types 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create system settings table for global configurations
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system settings
CREATE POLICY "All users can view settings" 
ON public.system_settings 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Only admins can manage settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for expense types
CREATE TRIGGER update_expense_types_updated_at
BEFORE UPDATE ON public.expense_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense types
INSERT INTO public.expense_types (type_name) VALUES 
('Food'),
('Police'),
('Phone'),
('Water'),
('Parking'),
('Toll'),
('Repair'),
('Other')
ON CONFLICT (type_name) DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description, category) VALUES 
('diesel_price_per_liter', '150.00', 'Current diesel price per liter', 'fuel'),
('default_expected_km_per_liter', '{"bus": 8.0, "mini_bus": 10.0, "coach": 6.5}', 'Expected fuel efficiency by bus type', 'performance')
ON CONFLICT (setting_key) DO NOTHING;