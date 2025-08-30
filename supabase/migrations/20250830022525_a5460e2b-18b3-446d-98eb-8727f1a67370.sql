-- Create trip confirmations table
CREATE TABLE public.trip_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  quotation_no TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  drop_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  bus_type_id UUID,
  number_of_buses INTEGER NOT NULL DEFAULT 1,
  number_of_passengers INTEGER NOT NULL,
  
  -- Trip execution details
  actual_bus_number TEXT,
  actual_driver_id UUID,
  actual_conductor_id UUID,
  actual_distance_km NUMERIC DEFAULT 0,
  actual_fuel_cost NUMERIC DEFAULT 0,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'confirmed',
  confirmed_by UUID,
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trip_started_at TIMESTAMP WITH TIME ZONE,
  trip_completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip expenses table
CREATE TABLE public.trip_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_confirmation_id UUID NOT NULL REFERENCES public.trip_confirmations(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL, -- 'fuel', 'wages', 'maintenance', 'highway_fees', 'permit_cost', 'commission', 'other'
  expense_description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_estimated BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip payments table
CREATE TABLE public.trip_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_confirmation_id UUID NOT NULL REFERENCES public.trip_confirmations(id) ON DELETE CASCADE,
  quotation_no TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'advance', -- 'advance', 'balance', 'refund'
  amount NUMERIC NOT NULL,
  rounded_amount NUMERIC NOT NULL, -- Rounded to nearest 50
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'received', 'verified', 'rejected'
  
  -- Payment proof
  payment_proof_url TEXT,
  payment_proof_filename TEXT,
  payment_method TEXT, -- 'bank_transfer', 'cash', 'card', 'online'
  payment_reference TEXT,
  payment_date DATE,
  
  -- Approval workflow
  received_by UUID,
  received_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip invoices table
CREATE TABLE public.trip_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_confirmation_id UUID NOT NULL REFERENCES public.trip_confirmations(id) ON DELETE CASCADE,
  quotation_no TEXT NOT NULL,
  invoice_no TEXT NOT NULL UNIQUE DEFAULT ('INV-' || EXTRACT(year FROM now()) || '-' || lpad(nextval('quotation_seq'::regclass)::text, 4, '0')),
  
  -- Invoice details
  total_quoted_amount NUMERIC NOT NULL DEFAULT 0,
  total_actual_amount NUMERIC NOT NULL DEFAULT 0,
  additional_charges NUMERIC DEFAULT 0,
  refund_amount NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment summary
  advance_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  
  invoice_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue'
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.trip_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view trip confirmations" 
ON public.trip_confirmations 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage trip confirmations" 
ON public.trip_confirmations 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "All authenticated users can view trip expenses" 
ON public.trip_expenses 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage trip expenses" 
ON public.trip_expenses 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "All authenticated users can view trip payments" 
ON public.trip_payments 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage trip payments" 
ON public.trip_payments 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "All authenticated users can view trip invoices" 
ON public.trip_invoices 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage trip invoices" 
ON public.trip_invoices 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_trip_confirmations_updated_at
BEFORE UPDATE ON public.trip_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_expenses_updated_at
BEFORE UPDATE ON public.trip_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_payments_updated_at
BEFORE UPDATE ON public.trip_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_invoices_updated_at
BEFORE UPDATE ON public.trip_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();