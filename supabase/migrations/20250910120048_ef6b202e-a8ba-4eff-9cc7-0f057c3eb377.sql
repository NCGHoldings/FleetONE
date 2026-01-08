-- Create School Bus Service Management Tables

-- 1. School Branches Table
CREATE TABLE public.school_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name TEXT NOT NULL,
  branch_code TEXT NOT NULL UNIQUE,
  address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_total_branch BOOLEAN DEFAULT false, -- For the "Total" aggregated view
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. School Routes Table
CREATE TABLE public.school_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.school_branches(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_code TEXT NOT NULL,
  start_location TEXT,
  end_location TEXT,
  pickup_points JSONB DEFAULT '[]'::jsonb,
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. School Students Table
CREATE TABLE public.school_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.school_branches(id) ON DELETE CASCADE,
  sbs_cord TEXT,
  student_name TEXT NOT NULL,
  pickup_point_cord TEXT,
  pickup_point_definition TEXT,
  admission_no TEXT,
  grade TEXT,
  school_location TEXT,
  route TEXT,
  bus_reg_no TEXT,
  driver_name TEXT,
  driver_contact_no TEXT,
  care_taker_name TEXT,
  care_taker_contact_no TEXT,
  parent_name TEXT,
  address TEXT,
  email_id TEXT,
  father_contact_no TEXT,
  mother_contact_no TEXT,
  payment_date DATE,
  update_new NUMERIC(10,2), -- Expected fee for current month
  service_type TEXT CHECK (service_type IN ('OneWay', 'BothWay')),
  pickup_point TEXT,
  dropoff_point TEXT,
  payment_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'partial')),
  last_payment_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4. School Payment Months Table (for dynamic monthly columns)
CREATE TABLE public.school_payment_months (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL, -- Format: "Jan 2025", "Feb 2025"
  month_date DATE NOT NULL, -- First day of the month
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. School Payments Table
CREATE TABLE public.school_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.school_students(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.school_branches(id) ON DELETE CASCADE,
  payment_month_id UUID REFERENCES public.school_payment_months(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  reference_no TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'verified', 'rejected')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. School Receipts Table
CREATE TABLE public.school_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.school_students(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.school_payments(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.school_branches(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  upload_source TEXT DEFAULT 'parent' CHECK (upload_source IN ('parent', 'admin', 'finance')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default branches
INSERT INTO public.school_branches (branch_name, branch_code, is_total_branch) VALUES
('Kurunegala', 'KUR', false),
('Nugegoda', 'NUG', false),
('Wattala', 'WAT', false),
('Panadura', 'PAN', false),
('Nuwara Eliya', 'NUW', false),
('Anuradhapura', 'ANU', false),
('Ratnapura', 'RAT', false),
('Total', 'TOT', true);

-- Enable Row Level Security
ALTER TABLE public.school_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- School Branches
CREATE POLICY "All authenticated users can view branches" ON public.school_branches FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Admins can manage branches" ON public.school_branches FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- School Routes
CREATE POLICY "All authenticated users can view routes" ON public.school_routes FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Admins can manage routes" ON public.school_routes FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- School Students
CREATE POLICY "All authenticated users can view students" ON public.school_students FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Staff can manage students" ON public.school_students FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- School Payment Months
CREATE POLICY "All authenticated users can view payment months" ON public.school_payment_months FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Admins can manage payment months" ON public.school_payment_months FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- School Payments
CREATE POLICY "All authenticated users can view payments" ON public.school_payments FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Staff can manage payments" ON public.school_payments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- School Receipts
CREATE POLICY "All authenticated users can view receipts" ON public.school_receipts FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Staff can manage receipts" ON public.school_receipts FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
CREATE POLICY "Parents can upload receipts" ON public.school_receipts FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Create indexes for better performance
CREATE INDEX idx_school_students_branch_id ON public.school_students(branch_id);
CREATE INDEX idx_school_students_admission_no ON public.school_students(admission_no);
CREATE INDEX idx_school_students_payment_status ON public.school_students(payment_status);
CREATE INDEX idx_school_payments_student_id ON public.school_payments(student_id);
CREATE INDEX idx_school_payments_branch_id ON public.school_payments(branch_id);
CREATE INDEX idx_school_payments_status ON public.school_payments(status);
CREATE INDEX idx_school_receipts_student_id ON public.school_receipts(student_id);
CREATE INDEX idx_school_receipts_verification_status ON public.school_receipts(verification_status);

-- Create triggers for updated_at
CREATE TRIGGER update_school_branches_updated_at BEFORE UPDATE ON public.school_branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_routes_updated_at BEFORE UPDATE ON public.school_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_students_updated_at BEFORE UPDATE ON public.school_students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_payments_updated_at BEFORE UPDATE ON public.school_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_receipts_updated_at BEFORE UPDATE ON public.school_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();