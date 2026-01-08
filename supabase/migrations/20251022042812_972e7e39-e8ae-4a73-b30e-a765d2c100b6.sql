-- Add vehicle detail columns to yutong_orders table
ALTER TABLE yutong_orders
ADD COLUMN IF NOT EXISTS engine_number TEXT,
ADD COLUMN IF NOT EXISTS chassis_number TEXT,
ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER,
ADD COLUMN IF NOT EXISTS country_of_origin TEXT DEFAULT 'CHINA',
ADD COLUMN IF NOT EXISTS vehicle_condition TEXT DEFAULT 'BRAND NEW',
ADD COLUMN IF NOT EXISTS fuel_type TEXT,
ADD COLUMN IF NOT EXISTS engine_capacity INTEGER,
ADD COLUMN IF NOT EXISTS color_scheme TEXT;

-- Create yutong_invoice_records table
CREATE TABLE IF NOT EXISTS public.yutong_invoice_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES public.yutong_quotations(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_amount NUMERIC NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'draft',
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yutong_invoice_records_order ON public.yutong_invoice_records(order_id);
CREATE INDEX IF NOT EXISTS idx_yutong_invoice_records_quotation ON public.yutong_invoice_records(quotation_id);

-- Create yutong_invoice_documents table
CREATE TABLE IF NOT EXISTS public.yutong_invoice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_record_id UUID NOT NULL REFERENCES public.yutong_invoice_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  document_status TEXT NOT NULL DEFAULT 'draft',
  invoice_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yutong_invoice_documents_record ON public.yutong_invoice_documents(invoice_record_id);

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.yutong_invoice_seq START WITH 1 INCREMENT BY 1;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_yutong_invoice_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.yutong_invoice_seq');
  RETURN 'NCGH-YT-' || TO_CHAR(NOW(), 'YY') || LPAD(seq_val::TEXT, 4, '0');
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.yutong_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_invoice_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for yutong_invoice_records
CREATE POLICY "Users can view invoice records"
ON public.yutong_invoice_records FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can create invoice records"
ON public.yutong_invoice_records FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can update invoice records"
ON public.yutong_invoice_records FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- RLS Policies for yutong_invoice_documents
CREATE POLICY "Users can view invoice documents"
ON public.yutong_invoice_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can create invoice documents"
ON public.yutong_invoice_documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can update invoice documents"
ON public.yutong_invoice_documents FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at on yutong_invoice_records
CREATE TRIGGER update_yutong_invoice_records_updated_at
BEFORE UPDATE ON public.yutong_invoice_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on yutong_invoice_documents
CREATE TRIGGER update_yutong_invoice_documents_updated_at
BEFORE UPDATE ON public.yutong_invoice_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();