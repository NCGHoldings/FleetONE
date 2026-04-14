-- Change document_data column from bytea to text to properly store base64 strings
ALTER TABLE public.document_storage ALTER COLUMN document_data TYPE text;

-- Update any existing binary data to base64 text format
-- This handles the conversion for existing records
UPDATE public.document_storage 
SET document_data = encode(document_data::bytea, 'base64')
WHERE document_data IS NOT NULL;