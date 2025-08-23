-- Add missing columns to daily_trips (only if they don't exist)
ALTER TABLE public.daily_trips 
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS diesel_price_per_liter DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS fuel_liters DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_expenses DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_income DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS km_per_liter DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to buses table
ALTER TABLE public.buses 
ADD COLUMN IF NOT EXISTS expected_km_per_liter DECIMAL(5,2) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS service_interval_km INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS last_service_mileage INTEGER,
ADD COLUMN IF NOT EXISTS next_service_mileage INTEGER,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_address TEXT,
ADD COLUMN IF NOT EXISTS owner_nic TEXT;

-- Create insurance table
CREATE TABLE IF NOT EXISTS public.insurance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  policy_number TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  policy_type TEXT NOT NULL,
  coverage_amount DECIMAL(15,2),
  premium_amount DECIMAL(10,2),
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  reminder_threshold_days INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance bays table
CREATE TABLE IF NOT EXISTS public.maintenance_bays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bay_number TEXT UNIQUE NOT NULL,
  bay_name TEXT NOT NULL,
  capacity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  can_work_overtime BOOLEAN DEFAULT false,
  default_workers INTEGER DEFAULT 2,
  hourly_rate DECIMAL(8,2) DEFAULT 500.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance timers table
CREATE TABLE IF NOT EXISTS public.maintenance_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID REFERENCES public.maintenance_records(id) NOT NULL,
  bay_id UUID REFERENCES public.maintenance_bays(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  pause_time TIMESTAMP WITH TIME ZONE,
  resume_time TIMESTAMP WITH TIME ZONE,
  total_minutes INTEGER DEFAULT 0,
  is_overtime BOOLEAN DEFAULT false,
  worker_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'stopped',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create special hire projects table
CREATE TABLE IF NOT EXISTS public.special_hire_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  pickup_datetime TIMESTAMP WITH TIME ZONE,
  distance_km DECIMAL(8,2),
  hire_type TEXT DEFAULT 'inside',
  estimated_price DECIMAL(10,2),
  extra_charges DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  net_income DECIMAL(10,2),
  status TEXT DEFAULT 'quotation',
  bus_id UUID REFERENCES public.buses(id),
  driver_id UUID REFERENCES public.profiles(id),
  conductor_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback and complaints table
CREATE TABLE IF NOT EXISTS public.feedback_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id TEXT UNIQUE,
  reported_by UUID REFERENCES public.profiles(id) NOT NULL,
  staff_group TEXT,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  current_handler UUID REFERENCES public.profiles(id),
  resolution TEXT,
  escalation_level INTEGER DEFAULT 1,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert sample insurance records
INSERT INTO public.insurance_records (bus_id, policy_number, insurance_company, agent_name, agent_phone, policy_type, coverage_amount, premium_amount, issue_date, expiry_date) 
SELECT 
  id,
  'INS-' || bus_no || '-2024',
  'National Insurance Corporation',
  'Sunil Jayawardena',
  '+94771234567',
  'Comprehensive',
  5000000.00,
  125000.00,
  '2024-01-01',
  insurance_expiry
FROM public.buses 
WHERE NOT EXISTS (SELECT 1 FROM public.insurance_records);

-- Insert default maintenance bays if not exists
INSERT INTO public.maintenance_bays (bay_number, bay_name, capacity, can_work_overtime, default_workers, hourly_rate)
SELECT * FROM (VALUES 
  ('BAY-01', 'Engine Bay', 1, true, 2, 600.00),
  ('BAY-02', 'Body Work Bay', 1, false, 3, 500.00),
  ('BAY-03', 'Electrical Bay', 1, true, 2, 650.00),
  ('BAY-04', 'General Service Bay', 2, false, 2, 450.00)
) AS v(bay_number, bay_name, capacity, can_work_overtime, default_workers, hourly_rate)
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_bays WHERE bay_number = v.bay_number);

-- Enhanced system settings with additional configurations
INSERT INTO public.system_settings (setting_key, setting_value, description, category)
SELECT * FROM (VALUES 
  ('maintenance_profit_margin', '"0.20"', 'Profit margin for maintenance services', 'maintenance'),
  ('workshop_hours', '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}, "saturday": {"start": "08:00", "end": "13:00"}, "sunday": "closed"}', 'Workshop working hours', 'maintenance'),
  ('whatsapp_gateway_url', '""', 'WhatsApp API gateway URL', 'notifications'),
  ('gps_api_endpoint', '""', 'GPS tracking API endpoint', 'tracking'),
  ('insurance_reminder_days', '"30"', 'Days before insurance expiry to send reminders', 'alerts'),
  ('permit_reminder_days', '"10"', 'Days before permit expiry to send reminders', 'alerts'),
  ('service_reminder_km', '"1000"', 'Kilometers before service due to send reminders', 'alerts')
) AS v(setting_key, setting_value, description, category)
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = v.setting_key);

-- Enable RLS on new tables
ALTER TABLE public.insurance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_hire_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_complaints ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "All authenticated users can view insurance" ON public.insurance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage insurance" ON public.insurance_records FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "All authenticated users can view bays" ON public.maintenance_bays FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Supervisors can manage bays" ON public.maintenance_bays FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "All authenticated users can view timers" ON public.maintenance_timers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Mechanics can manage timers" ON public.maintenance_timers FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'mechanic')
);

CREATE POLICY "All authenticated users can view special hire" ON public.special_hire_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage special hire" ON public.special_hire_projects FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "All authenticated users can view feedback" ON public.feedback_complaints FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can create feedback" ON public.feedback_complaints FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);
CREATE POLICY "Supervisors can manage feedback" ON public.feedback_complaints FOR UPDATE USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_insurance_records_updated_at BEFORE UPDATE ON public.insurance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_bays_updated_at BEFORE UPDATE ON public.maintenance_bays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_timers_updated_at BEFORE UPDATE ON public.maintenance_timers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_special_hire_projects_updated_at BEFORE UPDATE ON public.special_hire_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feedback_complaints_updated_at BEFORE UPDATE ON public.feedback_complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();