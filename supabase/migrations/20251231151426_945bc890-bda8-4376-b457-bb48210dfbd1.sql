-- Create salary type enum
CREATE TYPE public.salary_type AS ENUM ('monthly', 'daily');

-- Create staff type enum  
CREATE TYPE public.staff_type AS ENUM ('driver', 'conductor');

-- Create commission status enum
CREATE TYPE public.commission_status AS ENUM ('pending', 'approved', 'paid');

-- Create staff_registry table - central registry for all drivers and conductors
CREATE TABLE public.staff_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  staff_type public.staff_type NOT NULL,
  salary_type public.salary_type NOT NULL DEFAULT 'monthly',
  monthly_salary NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  contact_number TEXT,
  nic_number TEXT,
  emergency_contact TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_targets table - revenue targets per route for commission calculation
CREATE TABLE public.route_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  revenue_target NUMERIC NOT NULL DEFAULT 0,
  driver_commission_percent NUMERIC NOT NULL DEFAULT 5,
  conductor_commission_percent NUMERIC NOT NULL DEFAULT 3,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_commissions table - track calculated commissions
CREATE TABLE public.staff_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff_registry(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.daily_trips(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  trip_date DATE NOT NULL,
  route_revenue NUMERIC NOT NULL DEFAULT 0,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  excess_revenue NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status public.commission_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll_settings table - system-wide payroll settings
CREATE TABLE public.payroll_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add columns to staff_attendance table
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS staff_registry_id UUID REFERENCES public.staff_registry(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS salary_type public.salary_type,
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_earned NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.daily_trips(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN DEFAULT false;

-- Enable RLS on all new tables
ALTER TABLE public.staff_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staff_registry
CREATE POLICY "Staff registry viewable by authenticated users" 
ON public.staff_registry FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff registry manageable by authenticated users" 
ON public.staff_registry FOR ALL 
USING (auth.role() = 'authenticated');

-- Create RLS policies for route_targets
CREATE POLICY "Route targets viewable by authenticated users" 
ON public.route_targets FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Route targets manageable by authenticated users" 
ON public.route_targets FOR ALL 
USING (auth.role() = 'authenticated');

-- Create RLS policies for staff_commissions
CREATE POLICY "Staff commissions viewable by authenticated users" 
ON public.staff_commissions FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff commissions manageable by authenticated users" 
ON public.staff_commissions FOR ALL 
USING (auth.role() = 'authenticated');

-- Create RLS policies for payroll_settings
CREATE POLICY "Payroll settings viewable by authenticated users" 
ON public.payroll_settings FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Payroll settings manageable by authenticated users" 
ON public.payroll_settings FOR ALL 
USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_staff_registry_staff_type ON public.staff_registry(staff_type);
CREATE INDEX idx_staff_registry_is_active ON public.staff_registry(is_active);
CREATE INDEX idx_route_targets_route_id ON public.route_targets(route_id);
CREATE INDEX idx_route_targets_is_active ON public.route_targets(is_active);
CREATE INDEX idx_staff_commissions_staff_id ON public.staff_commissions(staff_id);
CREATE INDEX idx_staff_commissions_trip_date ON public.staff_commissions(trip_date);
CREATE INDEX idx_staff_commissions_status ON public.staff_commissions(status);
CREATE INDEX idx_staff_attendance_staff_registry_id ON public.staff_attendance(staff_registry_id);
CREATE INDEX idx_staff_attendance_trip_id ON public.staff_attendance(trip_id);

-- Create update timestamp triggers
CREATE TRIGGER update_staff_registry_updated_at
  BEFORE UPDATE ON public.staff_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_updated_at();

CREATE TRIGGER update_route_targets_updated_at
  BEFORE UPDATE ON public.route_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_updated_at();

CREATE TRIGGER update_staff_commissions_updated_at
  BEFORE UPDATE ON public.staff_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_updated_at();

-- Insert default payroll settings
INSERT INTO public.payroll_settings (setting_key, setting_value, description) VALUES
('working_days_per_month', '{"value": 26}', 'Default number of working days per month'),
('overtime_multiplier', '{"value": 1.5}', 'Overtime rate multiplier'),
('minimum_days_for_monthly', '{"value": 20}', 'Minimum days required for full monthly salary'),
('commission_payout_day', '{"value": 5}', 'Day of month for commission payout'),
('attendance_sync_frequency', '{"value": "daily"}', 'How often to sync attendance from trips'),
('auto_approve_commission_threshold', '{"value": 1000}', 'Auto-approve commissions below this amount')
ON CONFLICT (setting_key) DO NOTHING;