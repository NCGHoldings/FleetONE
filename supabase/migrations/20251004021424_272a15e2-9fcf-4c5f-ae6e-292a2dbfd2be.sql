-- Create bus_loans table
CREATE TABLE public.bus_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  loan_amount NUMERIC(12, 2) NOT NULL CHECK (loan_amount > 0),
  interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate > 0),
  loan_tenure_months INTEGER NOT NULL CHECK (loan_tenure_months > 0),
  monthly_installment NUMERIC(12, 2) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  lender_name TEXT NOT NULL,
  lender_contact TEXT,
  loan_type TEXT NOT NULL DEFAULT 'Vehicle Loan',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT one_active_loan_per_bus UNIQUE (bus_id, status)
);

-- Create bus_loan_payments table
CREATE TABLE public.bus_loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.bus_loans(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  principal_amount NUMERIC(12, 2) NOT NULL,
  interest_amount NUMERIC(12, 2) NOT NULL,
  total_installment NUMERIC(12, 2) NOT NULL,
  balance_remaining NUMERIC(12, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  actual_payment_date DATE,
  paid_by UUID REFERENCES auth.users(id),
  payment_proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (loan_id, payment_number)
);

-- Enable RLS
ALTER TABLE public.bus_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_loan_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bus_loans
CREATE POLICY "All authenticated users can view bus loans"
  ON public.bus_loans FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage bus loans"
  ON public.bus_loans FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- RLS Policies for bus_loan_payments
CREATE POLICY "All authenticated users can view loan payments"
  ON public.bus_loan_payments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage loan payments"
  ON public.bus_loan_payments FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_bus_loans_updated_at
  BEFORE UPDATE ON public.bus_loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_bus_loans_bus_id ON public.bus_loans(bus_id);
CREATE INDEX idx_bus_loans_status ON public.bus_loans(status);
CREATE INDEX idx_bus_loan_payments_loan_id ON public.bus_loan_payments(loan_id);
CREATE INDEX idx_bus_loan_payments_status ON public.bus_loan_payments(payment_status);
CREATE INDEX idx_bus_loan_payments_date ON public.bus_loan_payments(payment_date);