-- Create missing school bus service tables and enhance existing ones

-- School branches table (if not exists)
CREATE TABLE IF NOT EXISTS public.school_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name TEXT NOT NULL,
  branch_code TEXT UNIQUE NOT NULL,
  address TEXT,
  contact_phone TEXT,
  manager_name TEXT,
  is_total_branch BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- School payment months table
CREATE TABLE IF NOT EXISTS public.school_payment_months (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL UNIQUE,
  month_date DATE NOT NULL,
  due_date DATE,
  late_fee_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- School payments table
CREATE TABLE IF NOT EXISTS public.school_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  payment_month_id UUID NOT NULL REFERENCES public.school_payment_months(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  late_fee NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC GENERATED ALWAYS AS (amount + COALESCE(late_fee, 0) - COALESCE(discount_amount, 0)) STORED,
  payment_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (student_id) REFERENCES public.school_students(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES public.school_branches(id) ON DELETE CASCADE
);

-- Payment reminders table
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.school_students(id),
  payment_id UUID REFERENCES public.school_payments(id),
  branch_id UUID NOT NULL REFERENCES public.school_branches(id),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('overdue', 'upcoming', 'final_notice')),
  message TEXT NOT NULL,
  sent_via TEXT CHECK (sent_via IN ('sms', 'email', 'whatsapp')),
  sent_to TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  response TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Student attendance table for route tracking
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.school_students(id),
  branch_id UUID NOT NULL REFERENCES public.school_branches(id),
  route_id UUID REFERENCES public.school_routes(id),
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  pickup_time TIME,
  dropoff_time TIME,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);

-- Enhanced school_students table with additional fields
DO $$ 
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_students' AND column_name = 'emergency_contact') THEN
    ALTER TABLE public.school_students ADD COLUMN emergency_contact TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_students' AND column_name = 'medical_notes') THEN
    ALTER TABLE public.school_students ADD COLUMN medical_notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_students' AND column_name = 'photo_url') THEN
    ALTER TABLE public.school_students ADD COLUMN photo_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_students' AND column_name = 'enrollment_date') THEN
    ALTER TABLE public.school_students ADD COLUMN enrollment_date DATE DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_students' AND column_name = 'monthly_fee') THEN
    ALTER TABLE public.school_students ADD COLUMN monthly_fee NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.school_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_branches
CREATE POLICY "All authenticated users can view school branches" 
ON public.school_branches FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage school branches" 
ON public.school_branches FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for school_payment_months
CREATE POLICY "All authenticated users can view payment months" 
ON public.school_payment_months FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage payment months" 
ON public.school_payment_months FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for school_payments
CREATE POLICY "All authenticated users can view payments" 
ON public.school_payments FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage payments" 
ON public.school_payments FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for payment_reminders
CREATE POLICY "All authenticated users can view reminders" 
ON public.payment_reminders FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage reminders" 
ON public.payment_reminders FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for student_attendance
CREATE POLICY "All authenticated users can view attendance" 
ON public.student_attendance FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage attendance" 
ON public.student_attendance FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_payments_student_branch ON public.school_payments(student_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_school_payments_status ON public.school_payments(status);
CREATE INDEX IF NOT EXISTS idx_school_payments_month ON public.school_payments(payment_month_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_student ON public.payment_reminders(student_id);

-- Insert sample data for school branches
INSERT INTO public.school_branches (branch_name, branch_code, address, contact_phone, manager_name, is_total_branch)
VALUES 
  ('Total Dashboard', 'TOTAL', 'Head Office', '+94777123456', 'Admin User', true),
  ('Colombo Branch', 'COL01', '123 Galle Road, Colombo 03', '+94777111111', 'John Silva', false),
  ('Kandy Branch', 'KAN01', '456 Peradeniya Road, Kandy', '+94777222222', 'Priya Fernando', false),
  ('Galle Branch', 'GAL01', '789 Matara Road, Galle', '+94777333333', 'Sunil Perera', false),
  ('Negombo Branch', 'NEG01', '321 Main Street, Negombo', '+94777444444', 'Kamala Wijeratne', false),
  ('Jaffna Branch', 'JAF01', '654 Hospital Road, Jaffna', '+94777555555', 'Kumar Siva', false),
  ('Matara Branch', 'MAT01', '987 Beach Road, Matara', '+94777666666', 'Nimal Ratne', false),
  ('Kurunegala Branch', 'KUR01', '147 Dambulla Road, Kurunegala', '+94777777777', 'Saman Jayakody', false)
ON CONFLICT (branch_code) DO NOTHING;

-- Insert sample payment months for current year
INSERT INTO public.school_payment_months (month_year, month_date, due_date, late_fee_amount)
VALUES 
  ('January 2025', '2025-01-01', '2025-01-15', 200.00),
  ('February 2025', '2025-02-01', '2025-02-15', 200.00),
  ('March 2025', '2025-03-01', '2025-03-15', 200.00),
  ('April 2025', '2025-04-01', '2025-04-15', 200.00),
  ('May 2025', '2025-05-01', '2025-05-15', 200.00),
  ('June 2025', '2025-06-01', '2025-06-15', 200.00),
  ('July 2025', '2025-07-01', '2025-07-15', 200.00),
  ('August 2025', '2025-08-01', '2025-08-15', 200.00),
  ('September 2025', '2025-09-01', '2025-09-15', 200.00),
  ('October 2025', '2025-10-01', '2025-10-15', 200.00),
  ('November 2025', '2025-11-01', '2025-11-15', 200.00),
  ('December 2025', '2025-12-01', '2025-12-15', 200.00)
ON CONFLICT (month_year) DO NOTHING;

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_school_branches_updated_at') THEN
    CREATE TRIGGER update_school_branches_updated_at
      BEFORE UPDATE ON public.school_branches
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_school_payment_months_updated_at') THEN
    CREATE TRIGGER update_school_payment_months_updated_at
      BEFORE UPDATE ON public.school_payment_months
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_school_payments_updated_at') THEN
    CREATE TRIGGER update_school_payments_updated_at
      BEFORE UPDATE ON public.school_payments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;