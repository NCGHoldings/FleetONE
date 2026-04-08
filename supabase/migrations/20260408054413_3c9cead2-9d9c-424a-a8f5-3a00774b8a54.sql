-- Add document_url column to ap_payments
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS document_url text;

-- Ensure documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ap_payments prefix
CREATE POLICY "Authenticated users can upload AP payment docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'ap_payments');

CREATE POLICY "Authenticated users can view AP payment docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'ap_payments');

CREATE POLICY "Authenticated users can delete AP payment docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'ap_payments');