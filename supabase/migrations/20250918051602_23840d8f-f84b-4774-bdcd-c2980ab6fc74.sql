-- Create route_expenses table for tracking route-specific costs
CREATE TABLE public.route_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('maintenance', 'fuel', 'parking', 'other')),
  expense_category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_staff_costs table for driver/caretaker salaries
CREATE TABLE public.route_staff_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  staff_type TEXT NOT NULL CHECK (staff_type IN ('driver', 'caretaker', 'other')),
  staff_name TEXT NOT NULL,
  monthly_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_rate NUMERIC(10,2),
  contact_number TEXT,
  nic_number TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhance school_routes table with financial tracking
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS bus_reg_no TEXT;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS driver_contact TEXT;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS total_income NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS net_profit NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.route_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_staff_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for route_expenses
CREATE POLICY "All authenticated users can view route expenses" 
ON public.route_expenses 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Staff can manage route expenses" 
ON public.route_expenses 
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create policies for route_staff_costs
CREATE POLICY "All authenticated users can view route staff costs" 
ON public.route_staff_costs 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Staff can manage route staff costs" 
ON public.route_staff_costs 
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create triggers for updated_at columns
CREATE TRIGGER update_route_expenses_updated_at
BEFORE UPDATE ON public.route_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_route_staff_costs_updated_at
BEFORE UPDATE ON public.route_staff_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_route_expenses_route_id ON public.route_expenses(route_id);
CREATE INDEX idx_route_expenses_branch_id ON public.route_expenses(branch_id);
CREATE INDEX idx_route_expenses_date ON public.route_expenses(expense_date);
CREATE INDEX idx_route_staff_costs_route_id ON public.route_staff_costs(route_id);
CREATE INDEX idx_route_staff_costs_branch_id ON public.route_staff_costs(branch_id);
CREATE INDEX idx_route_staff_costs_active ON public.route_staff_costs(is_active) WHERE is_active = true;