-- Create document_versions table for tracking all document versions and changes
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'quotation', 'advance_receipt', 'balance_invoice', 'post_trip_adjustment', 'sales_receipt'
  version_number INTEGER NOT NULL DEFAULT 1,
  document_data JSONB NOT NULL, -- Full document data snapshot
  changes_made JSONB, -- What was changed from previous version { field: { old: X, new: Y } }
  change_reason TEXT,
  document_status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'preview', 'generated', 'sent', 'approved'
  generated_pdf_path TEXT, -- Storage path to PDF if generated
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_document_versions_quotation ON public.document_versions(quotation_id);
CREATE INDEX idx_document_versions_type ON public.document_versions(document_type);
CREATE INDEX idx_document_versions_status ON public.document_versions(document_status);

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_versions
CREATE POLICY "Authenticated users can view document versions"
ON public.document_versions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert document versions"
ON public.document_versions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update document versions"
ON public.document_versions
FOR UPDATE
TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_document_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_document_versions_updated_at
BEFORE UPDATE ON public.document_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_document_versions_updated_at();