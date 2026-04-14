-- Create driver allocations table for managing assignments
CREATE TABLE public.driver_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id TEXT NOT NULL,
  bus_id UUID REFERENCES public.buses(id),
  route_id UUID REFERENCES public.routes(id),
  driver_id UUID,
  conductor_id UUID,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  whatsapp_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_allocations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view allocations" 
ON public.driver_allocations 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage allocations" 
ON public.driver_allocations 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create staff attendance table
CREATE TABLE public.staff_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  staff_name TEXT NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_id UUID,
  bus_no TEXT,
  route TEXT,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  hours_worked NUMERIC(4,2) DEFAULT 0,
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present',
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, attendance_date, trip_id)
);

-- Enable RLS
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view attendance" 
ON public.staff_attendance 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage attendance" 
ON public.staff_attendance 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create payroll records table
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  staff_name TEXT NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary NUMERIC(10,2) DEFAULT 0,
  overtime_pay NUMERIC(10,2) DEFAULT 0,
  allowances NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  gross_pay NUMERIC(10,2) GENERATED ALWAYS AS (base_salary + overtime_pay + allowances) STORED,
  net_pay NUMERIC(10,2) GENERATED ALWAYS AS (base_salary + overtime_pay + allowances - deductions) STORED,
  status TEXT NOT NULL DEFAULT 'draft',
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, pay_period_start, pay_period_end)
);

-- Enable RLS
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view payroll" 
ON public.payroll_records 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage payroll" 
ON public.payroll_records 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create payroll adjustments table for audit trail
CREATE TABLE public.payroll_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_record_id UUID REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL, -- 'allowance', 'deduction', 'overtime_adjustment'
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  adjusted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view adjustments" 
ON public.payroll_adjustments 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can manage adjustments" 
ON public.payroll_adjustments 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_driver_allocations_updated_at
BEFORE UPDATE ON public.driver_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_attendance_updated_at
BEFORE UPDATE ON public.staff_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at
BEFORE UPDATE ON public.payroll_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for driver allocations
INSERT INTO public.driver_allocations (trip_id, bus_id, route_id, driver_id, conductor_id, allocation_date, start_time, end_time, status) VALUES
('TRP001', (SELECT id FROM buses LIMIT 1), (SELECT id FROM routes LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1 OFFSET 1), CURRENT_DATE, '06:00', '18:00', 'confirmed'),
('TRP002', (SELECT id FROM buses LIMIT 1 OFFSET 1), (SELECT id FROM routes LIMIT 1), (SELECT user_id FROM profiles LIMIT 1 OFFSET 2), (SELECT user_id FROM profiles LIMIT 1 OFFSET 3), CURRENT_DATE + 1, '07:00', '19:00', 'scheduled');

-- Insert sample attendance data
INSERT INTO public.staff_attendance (staff_id, staff_name, attendance_date, trip_id, bus_no, route, start_time, end_time, hours_worked, overtime_hours, status) VALUES
((SELECT user_id FROM profiles LIMIT 1), 'John Doe', CURRENT_DATE, 'TRP001', 'B001', 'Route 1', '06:00', '18:00', 12, 2, 'present'),
((SELECT user_id FROM profiles LIMIT 1 OFFSET 1), 'Jane Smith', CURRENT_DATE, 'TRP001', 'B001', 'Route 1', '06:00', '18:00', 12, 2, 'present');

-- Insert sample payroll data
INSERT INTO public.payroll_records (staff_id, staff_name, pay_period_start, pay_period_end, base_salary, overtime_pay, allowances, deductions, status) VALUES
((SELECT user_id FROM profiles LIMIT 1), 'John Doe', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 45000.00, 5000.00, 2000.00, 1500.00, 'processed'),
((SELECT user_id FROM profiles LIMIT 1 OFFSET 1), 'Jane Smith', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 40000.00, 3000.00, 1500.00, 1000.00, 'draft');