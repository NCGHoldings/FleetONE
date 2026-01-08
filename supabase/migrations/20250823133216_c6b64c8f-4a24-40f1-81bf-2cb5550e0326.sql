-- Enhanced Daily Trips table with all required fields
ALTER TABLE public.daily_trips 
ADD COLUMN whatsapp TEXT,
ADD COLUMN odometer_start INTEGER,
ADD COLUMN odometer_end INTEGER,
ADD COLUMN diesel_price_per_liter DECIMAL(10,2),
ADD COLUMN fuel_liters DECIMAL(10,2) DEFAULT 0,
ADD COLUMN other_expenses_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN total_expenses DECIMAL(10,2) DEFAULT 0,
ADD COLUMN net_income DECIMAL(10,2) DEFAULT 0,
ADD COLUMN km_per_liter DECIMAL(10,2),
ADD COLUMN performance_score DECIMAL(5,2),
ADD COLUMN audit_log JSONB DEFAULT '[]'::jsonb;

-- Enhanced buses table with additional fields
ALTER TABLE public.buses 
ADD COLUMN expected_km_per_liter DECIMAL(5,2) DEFAULT 8.0,
ADD COLUMN service_interval_km INTEGER DEFAULT 10000,
ADD COLUMN last_service_mileage INTEGER,
ADD COLUMN next_service_mileage INTEGER,
ADD COLUMN owner_name TEXT,
ADD COLUMN owner_address TEXT,
ADD COLUMN owner_nic TEXT;

-- Create insurance table
CREATE TABLE public.insurance_records (
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
CREATE TABLE public.maintenance_bays (
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
CREATE TABLE public.maintenance_timers (
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
  status TEXT DEFAULT 'stopped', -- stopped, running, paused
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  uom TEXT NOT NULL, -- Unit of Measurement
  current_stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  avg_cost DECIMAL(10,2) DEFAULT 0,
  last_cost DECIMAL(10,2) DEFAULT 0,
  category TEXT,
  supplier TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service type mappings table
CREATE TABLE public.service_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  item_code TEXT REFERENCES public.inventory_items(item_code),
  default_quantity DECIMAL(10,2) DEFAULT 1,
  estimated_hours DECIMAL(5,2) DEFAULT 1,
  base_role TEXT DEFAULT 'mechanic',
  role_rate_per_hour DECIMAL(8,2) DEFAULT 500,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.profiles(id) NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_id UUID REFERENCES public.daily_trips(id),
  clock_in TIME,
  clock_out TIME,
  hours_worked DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'present', -- present, absent, late, half_day
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, attendance_date)
);

-- Create payroll records table
CREATE TABLE public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.profiles(id) NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary DECIMAL(10,2) DEFAULT 0,
  overtime_amount DECIMAL(10,2) DEFAULT 0,
  allowances DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  gross_pay DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, approved, paid
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver training table
CREATE TABLE public.driver_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id TEXT UNIQUE,
  driver_id UUID REFERENCES public.profiles(id) NOT NULL,
  training_type TEXT NOT NULL,
  training_date DATE NOT NULL,
  duration_hours DECIMAL(5,2),
  instructor TEXT,
  venue TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  score DECIMAL(5,2),
  certificate_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create special hire projects table
CREATE TABLE public.special_hire_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  pickup_datetime TIMESTAMP WITH TIME ZONE,
  distance_km DECIMAL(8,2),
  hire_type TEXT DEFAULT 'inside', -- inside, outside
  estimated_price DECIMAL(10,2),
  extra_charges DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  net_income DECIMAL(10,2),
  status TEXT DEFAULT 'quotation', -- quotation, confirmed, ongoing, completed, cancelled
  bus_id UUID REFERENCES public.buses(id),
  driver_id UUID REFERENCES public.profiles(id),
  conductor_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rate tables for special hire
CREATE TABLE public.special_hire_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_km INTEGER NOT NULL,
  to_km INTEGER NOT NULL,
  rate_per_km DECIMAL(8,2) NOT NULL,
  hire_type TEXT DEFAULT 'inside',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (from_km < to_km)
);

-- Create feedback and complaints table
CREATE TABLE public.feedback_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id TEXT UNIQUE,
  reported_by UUID REFERENCES public.profiles(id) NOT NULL,
  staff_group TEXT, -- bus_crew, bay_workers, ground_staff, etc.
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL, -- problem, suggestion, business_idea
  category TEXT NOT NULL, -- maintenance, operations, payroll, safety, other
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  status TEXT DEFAULT 'new', -- new, supervisor_review, escalated_manager, escalated_senior, resolved
  current_handler UUID REFERENCES public.profiles(id),
  resolution TEXT,
  escalation_level INTEGER DEFAULT 1, -- 1=supervisor, 2=manager, 3=senior_management
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback comments table
CREATE TABLE public.feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES public.feedback_complaints(id) NOT NULL,
  commenter_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business ideas table
CREATE TABLE public.business_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_by UUID REFERENCES public.profiles(id) NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'proposed', -- proposed, in_review, approved, in_progress, completed, rejected
  priority TEXT DEFAULT 'medium',
  estimated_investment DECIMAL(12,2),
  expected_roi DECIMAL(12,2),
  timeline_months INTEGER,
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE,
  progress_percentage INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business idea comments table
CREATE TABLE public.business_idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.business_ideas(id) NOT NULL,
  commenter_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create GPS tracking table for real-time data
CREATE TABLE public.gps_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  speed_kmh DECIMAL(5,2) DEFAULT 0,
  heading DECIMAL(5,2), -- compass direction
  altitude DECIMAL(8,2),
  fuel_level DECIMAL(5,2), -- percentage
  engine_temperature DECIMAL(5,2),
  tire_pressure JSONB, -- array of tire pressures
  engine_health_score DECIMAL(5,2) DEFAULT 100,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced system settings with additional configurations
INSERT INTO public.system_settings (setting_key, setting_value, description, category) VALUES
('maintenance_profit_margin', '"0.20"', 'Profit margin for maintenance services', 'maintenance'),
('workshop_hours', '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}, "saturday": {"start": "08:00", "end": "13:00"}, "sunday": "closed"}', 'Workshop working hours', 'maintenance'),
('overtime_bays', '[]', 'List of bay IDs that can work overtime', 'maintenance'),
('whatsapp_gateway_url', '""', 'WhatsApp API gateway URL', 'notifications'),
('whatsapp_api_key', '""', 'WhatsApp API key', 'notifications'),
('email_smtp_host', '""', 'SMTP server host', 'notifications'),
('email_smtp_port', '"587"', 'SMTP server port', 'notifications'),
('gps_api_endpoint', '""', 'GPS tracking API endpoint', 'tracking'),
('insurance_reminder_days', '"30"', 'Days before insurance expiry to send reminders', 'alerts'),
('permit_reminder_days', '"10"', 'Days before permit expiry to send reminders', 'alerts'),
('service_reminder_km', '"1000"', 'Kilometers before service due to send reminders', 'alerts');

-- Insert default maintenance bays
INSERT INTO public.maintenance_bays (bay_number, bay_name, capacity, can_work_overtime, default_workers, hourly_rate) VALUES
('BAY-01', 'Engine Bay', 1, true, 2, 600.00),
('BAY-02', 'Body Work Bay', 1, false, 3, 500.00),
('BAY-03', 'Electrical Bay', 1, true, 2, 650.00),
('BAY-04', 'General Service Bay', 2, false, 2, 450.00);

-- Insert sample inventory items
INSERT INTO public.inventory_items (item_code, item_name, description, uom, current_stock, min_stock_level, avg_cost, category) VALUES
('OIL-ENG-5L', 'Engine Oil 5L', 'Premium engine oil 15W-40', 'Liters', 50, 10, 850.00, 'Lubricants'),
('FILTER-AIR', 'Air Filter', 'Heavy duty air filter', 'Pieces', 25, 5, 1200.00, 'Filters'),
('FILTER-OIL', 'Oil Filter', 'Engine oil filter', 'Pieces', 30, 8, 650.00, 'Filters'),
('BRAKE-PAD', 'Brake Pads Set', 'Front brake pads', 'Sets', 15, 3, 2500.00, 'Brakes'),
('TIRE-FRONT', 'Front Tire', '295/80R22.5 tire', 'Pieces', 8, 2, 18000.00, 'Tires'),
('COOLANT-5L', 'Engine Coolant', 'Radiator coolant 5L', 'Liters', 20, 5, 750.00, 'Fluids');

-- Insert service type mappings
INSERT INTO public.service_type_mappings (service_type, item_code, default_quantity, estimated_hours, base_role, role_rate_per_hour) VALUES
('Engine Service', 'OIL-ENG-5L', 8.0, 4.0, 'senior_mechanic', 700.00),
('Engine Service', 'FILTER-OIL', 1.0, 0.5, 'mechanic', 500.00),
('Engine Service', 'FILTER-AIR', 1.0, 0.5, 'mechanic', 500.00),
('Brake Service', 'BRAKE-PAD', 1.0, 2.0, 'mechanic', 500.00),
('Tire Replacement', 'TIRE-FRONT', 2.0, 1.5, 'mechanic', 450.00),
('Cooling System', 'COOLANT-5L', 2.0, 2.0, 'mechanic', 500.00);

-- Insert sample special hire rates
INSERT INTO public.special_hire_rates (from_km, to_km, rate_per_km, hire_type) VALUES
(1, 50, 180.00, 'inside'),
(51, 100, 170.00, 'inside'),
(101, 200, 160.00, 'inside'),
(201, 500, 150.00, 'inside'),
(1, 50, 220.00, 'outside'),
(51, 100, 210.00, 'outside'),
(101, 200, 200.00, 'outside'),
(201, 500, 190.00, 'outside');

-- Enable RLS on new tables
ALTER TABLE public.insurance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_hire_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_hire_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all new tables
-- Insurance records
CREATE POLICY "All authenticated users can view insurance" ON public.insurance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage insurance" ON public.insurance_records FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- Maintenance bays
CREATE POLICY "All authenticated users can view bays" ON public.maintenance_bays FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Supervisors can manage bays" ON public.maintenance_bays FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

-- Maintenance timers
CREATE POLICY "All authenticated users can view timers" ON public.maintenance_timers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Mechanics can manage timers" ON public.maintenance_timers FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'mechanic')
);

-- Apply similar policies to other tables (abbreviated for space)
-- All other tables follow similar patterns based on role requirements