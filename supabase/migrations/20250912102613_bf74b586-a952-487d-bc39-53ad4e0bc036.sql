-- Create yutong_invoices table for invoice management
CREATE TABLE public.yutong_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL,
  invoice_no TEXT NOT NULL DEFAULT ('YTI-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('yutong_quotation_seq')::text, 4, '0')),
  invoice_type TEXT NOT NULL DEFAULT 'full', -- 'advance', 'balance', 'full'
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved'
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yutong_invoices
ALTER TABLE public.yutong_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for yutong_invoices
CREATE POLICY "All authenticated users can view Yutong invoices" 
ON public.yutong_invoices 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Staff can manage Yutong invoices" 
ON public.yutong_invoices 
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_yutong_invoices_updated_at
BEFORE UPDATE ON public.yutong_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();