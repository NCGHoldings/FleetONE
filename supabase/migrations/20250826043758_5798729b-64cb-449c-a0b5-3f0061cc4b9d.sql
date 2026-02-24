-- Create service_types table for pay rate management
CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hourly_rate NUMERIC DEFAULT 500.00,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repair_staff_log table for tracking staff changes during repairs
CREATE TABLE IF NOT EXISTS public.repair_staff_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_record_id UUID NOT NULL,
  staff_count INTEGER NOT NULL DEFAULT 1,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  hours_worked NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_financials table for comprehensive financial tracking
CREATE TABLE IF NOT EXISTS public.maintenance_financials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_record_id UUID NOT NULL,
  bay_id UUID,
  service_type TEXT NOT NULL,
  total_staff_hours NUMERIC DEFAULT 0,
  hourly_pay_rate NUMERIC DEFAULT 500.00,
  labour_cost NUMERIC DEFAULT 0,
  inventory_cost NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  profit_margin_percent NUMERIC DEFAULT 20,
  revenue NUMERIC DEFAULT 0,
  net_income NUMERIC DEFAULT 0,
  override_values JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to maintenance_records for enhanced tracking
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS countdown_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_staff_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_staff_count INTEGER DEFAULT 1;

-- Add new columns to maintenance_bays for default service type
ALTER TABLE public.maintenance_bays 
ADD COLUMN IF NOT EXISTS default_service_type TEXT,
ADD COLUMN IF NOT EXISTS default_hourly_rate NUMERIC DEFAULT 500.00;

-- Enable RLS on new tables
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_staff_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_financials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_types
CREATE POLICY "All authenticated users can view service types" 
ON public.service_types 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage service types" 
ON public.service_types 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for repair_staff_log
CREATE POLICY "All authenticated users can view staff log" 
ON public.repair_staff_log 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage staff log" 
ON public.repair_staff_log 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'mechanic'::app_role));

-- Create RLS policies for maintenance_financials
CREATE POLICY "All authenticated users can view financials" 
ON public.maintenance_financials 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage financials" 
ON public.maintenance_financials 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create update triggers
CREATE TRIGGER update_service_types_updated_at
BEFORE UPDATE ON public.service_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_financials_updated_at
BEFORE UPDATE ON public.maintenance_financials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default service types
INSERT INTO public.service_types (name, hourly_rate, description) VALUES 
('Engine Repair', 600.00, 'Engine related repairs and maintenance'),
('Brake Service', 450.00, 'Brake system maintenance and repair'),
('Tyre Service', 250.00, 'Tyre replacement and wheel alignment'),
('Paint Work', 400.00, 'Body paint and cosmetic repairs'),
('Electrical', 550.00, 'Electrical system repairs'),
('Air Conditioning', 500.00, 'AC system maintenance and repair'),
('Transmission', 650.00, 'Transmission and gearbox repairs'),
('Body Work', 350.00, 'Body repairs and panel work'),
('Routine Service', 300.00, 'Regular maintenance and inspections'),
('Emergency Repair', 800.00, 'Emergency breakdown repairs')
ON CONFLICT (name) DO NOTHING;