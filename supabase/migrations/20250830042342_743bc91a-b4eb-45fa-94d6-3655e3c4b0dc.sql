-- Sequences for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_seq;

-- Trip confirmations table
CREATE TABLE IF NOT EXISTS public.trip_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  advance_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  driver_name TEXT,
  conductor_name TEXT,
  bus_no TEXT,
  bus_id UUID REFERENCES public.buses(id),
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "All authenticated users can view trip confirmations"
ON public.trip_confirmations FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Staff can manage trip confirmations"
ON public.trip_confirmations FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- Trip payments table
CREATE TABLE IF NOT EXISTS public.trip_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_confirmation_id UUID NOT NULL REFERENCES public.trip_confirmations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'advance', -- advance | final | full | other
  payment_status TEXT NOT NULL DEFAULT 'received', -- pending | received | confirmed
  method TEXT, -- cash | bank_transfer | card | other
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_proof_url TEXT,
  payment_proof_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "All authenticated users can view trip payments"
ON public.trip_payments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Staff can manage trip payments"
ON public.trip_payments FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- Trip invoices table
CREATE TABLE IF NOT EXISTS public.trip_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_confirmation_id UUID NOT NULL REFERENCES public.trip_confirmations(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL DEFAULT (
    'INV-' || EXTRACT(YEAR FROM now()) || '-' || lpad(nextval('invoice_seq')::text, 4, '0')
  ),
  invoice_type TEXT NOT NULL DEFAULT 'advance', -- advance | final
  amount NUMERIC NOT NULL DEFAULT 0,
  pdf_path TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "All authenticated users can view trip invoices"
ON public.trip_invoices FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Staff can manage trip invoices"
ON public.trip_invoices FOR ALL
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- Triggers for updated_at
CREATE TRIGGER update_trip_confirmations_updated_at
BEFORE UPDATE ON public.trip_confirmations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_payments_updated_at
BEFORE UPDATE ON public.trip_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_invoices_updated_at
BEFORE UPDATE ON public.trip_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();