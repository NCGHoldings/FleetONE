-- Add new tables and enhance existing ones for advanced maintenance management

-- Service Master table for Excel/CSV mapping
CREATE TABLE IF NOT EXISTS public.service_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  item_code TEXT,
  item_description TEXT,
  default_qty NUMERIC DEFAULT 1,
  base_role TEXT,
  role_rate_per_hour NUMERIC DEFAULT 500,
  estimated_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance Timers table
CREATE TABLE IF NOT EXISTS public.maintenance_timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_record_id UUID NOT NULL,
  bay_id UUID,
  worker_count INTEGER DEFAULT 1,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  pause_time TIMESTAMP WITH TIME ZONE,
  resume_time TIMESTAMP WITH TIME ZONE,
  total_minutes INTEGER DEFAULT 0,
  is_overtime BOOLEAN DEFAULT false,
  overtime_approved_by UUID,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance Parts table
CREATE TABLE IF NOT EXISTS public.maintenance_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_record_id UUID NOT NULL,
  item_code TEXT,
  item_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workshop Settings table
CREATE TABLE IF NOT EXISTS public.workshop_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_type TEXT NOT NULL, -- 'working_hours', 'calendar', 'rates'
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setting_type, setting_key)
);

-- Add new fields to maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS next_service_km INTEGER,
ADD COLUMN IF NOT EXISTS next_service_date DATE,
ADD COLUMN IF NOT EXISTS parts_total_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_total_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS timer_status TEXT DEFAULT 'stopped', -- stopped, running, paused
ADD COLUMN IF NOT EXISTS current_bay_id UUID;

-- Add new fields to maintenance_bays
ALTER TABLE public.maintenance_bays 
ADD COLUMN IF NOT EXISTS can_work_overtime BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_maintenance_id UUID,
ADD COLUMN IF NOT EXISTS overtime_rate_multiplier NUMERIC DEFAULT 1.5;

-- Enable RLS
ALTER TABLE public.service_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_master
CREATE POLICY "All authenticated users can view service master" 
ON public.service_master 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Supervisors can manage service master" 
ON public.service_master 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for maintenance_timers
CREATE POLICY "All authenticated users can view timers" 
ON public.maintenance_timers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Supervisors can manage timers" 
ON public.maintenance_timers 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'mechanic'::app_role));

-- RLS Policies for maintenance_parts
CREATE POLICY "All authenticated users can view parts" 
ON public.maintenance_parts 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Supervisors can manage parts" 
ON public.maintenance_parts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for workshop_settings
CREATE POLICY "All authenticated users can view workshop settings" 
ON public.workshop_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workshop settings" 
ON public.workshop_settings 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default workshop settings
INSERT INTO public.workshop_settings (setting_type, setting_key, setting_value) VALUES
('working_hours', 'weekday', '{"start": "08:00", "end": "17:00"}'),
('working_hours', 'saturday', '{"start": "08:00", "end": "13:00"}'),
('working_hours', 'sunday', '{"enabled": false}'),
('rates', 'default_labor_rate', '{"rate": 500}'),
('rates', 'overtime_multiplier', '{"multiplier": 1.5}'),
('calendar', 'profit_margin', '{"percent": 20}')
ON CONFLICT (setting_type, setting_key) DO NOTHING;

-- Insert sample service master data
INSERT INTO public.service_master (service_type, item_code, item_description, default_qty, base_role, role_rate_per_hour, estimated_hours, notes) VALUES
('routine', 'OIL001', 'Engine Oil Change', 1, 'mechanic', 500, 2, 'Standard oil change service'),
('routine', 'FILTER001', 'Air Filter Replacement', 1, 'mechanic', 500, 0.5, 'Replace air filter'),
('routine', 'BRAKE001', 'Brake Pad Inspection', 1, 'mechanic', 500, 1, 'Check brake pad thickness'),
('repair', 'ENGINE001', 'Engine Overhaul', 1, 'senior_mechanic', 800, 16, 'Complete engine rebuild'),
('repair', 'TRANS001', 'Transmission Repair', 1, 'senior_mechanic', 800, 8, 'Transmission service'),
('inspection', 'SAFETY001', 'Safety Inspection', 1, 'inspector', 600, 2, 'Annual safety check'),
('emergency', 'TOWING001', 'Emergency Towing', 1, 'driver', 300, 1, 'Emergency roadside assistance')
ON CONFLICT DO NOTHING;

-- Add triggers for updated_at
CREATE TRIGGER update_service_master_updated_at
BEFORE UPDATE ON public.service_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workshop_settings_updated_at
BEFORE UPDATE ON public.workshop_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();