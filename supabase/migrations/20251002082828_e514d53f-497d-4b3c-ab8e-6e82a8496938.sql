-- Add document_type column to accident_documents table
ALTER TABLE public.accident_documents
ADD COLUMN document_type text NOT NULL DEFAULT 'Other';

-- Add a comment to describe valid values
COMMENT ON COLUMN public.accident_documents.document_type IS 'Valid values: License, Estimate Receipt, Final Bill, Part Quotation, After Repair Inspection, Other';