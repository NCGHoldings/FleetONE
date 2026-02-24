-- Create document storage table for storing generated PDFs and documents
CREATE TABLE public.document_storage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL,
  payment_id UUID REFERENCES public.special_hire_payments(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('sales_receipt', 'invoice')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'balance', 'full')),
  document_status TEXT NOT NULL DEFAULT 'draft' CHECK (document_status IN ('draft', 'approved')),
  document_data BYTEA NOT NULL, -- Store PDF as binary data
  file_name TEXT NOT NULL,
  file_size BIGINT,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.document_storage ENABLE ROW LEVEL SECURITY;

-- Create policies for document access
CREATE POLICY "All authenticated users can view documents" 
ON public.document_storage 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage documents" 
ON public.document_storage 
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_document_storage_updated_at
BEFORE UPDATE ON public.document_storage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();