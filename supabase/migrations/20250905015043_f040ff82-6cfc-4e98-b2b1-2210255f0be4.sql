-- Create special_hire_payments table
CREATE TABLE public.special_hire_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'balance', 'full')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card')),
  reference_no TEXT,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create special_hire_invoices table
CREATE TABLE public.special_hire_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('advance', 'final')),
  invoice_no TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quotation_id, invoice_type)
);

-- Enable RLS
ALTER TABLE public.special_hire_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_hire_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "All authenticated users can view payments" 
ON public.special_hire_payments 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Staff can manage payments" 
ON public.special_hire_payments 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS policies for invoices
CREATE POLICY "All authenticated users can view invoices" 
ON public.special_hire_invoices 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Staff can manage invoices" 
ON public.special_hire_invoices 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create indexes for performance
CREATE INDEX idx_payments_quotation_id ON public.special_hire_payments(quotation_id);
CREATE INDEX idx_payments_payment_type ON public.special_hire_payments(payment_type);
CREATE INDEX idx_invoices_quotation_id ON public.special_hire_invoices(quotation_id);
CREATE INDEX idx_invoices_invoice_type ON public.special_hire_invoices(invoice_type);

-- Create triggers for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.special_hire_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.special_hire_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time for all related tables
ALTER TABLE public.special_hire_quotations REPLICA IDENTITY FULL;
ALTER TABLE public.special_hire_payments REPLICA IDENTITY FULL;
ALTER TABLE public.special_hire_invoices REPLICA IDENTITY FULL;

-- Add tables to realtime publication (assuming supabase_realtime exists)
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_hire_quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_hire_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_hire_invoices;