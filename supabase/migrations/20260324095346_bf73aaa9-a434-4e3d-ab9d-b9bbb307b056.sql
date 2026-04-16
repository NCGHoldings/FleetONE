-- 1. Add storage_path column to document_storage
ALTER TABLE public.document_storage ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Create generated-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for generated-documents bucket
CREATE POLICY "Authenticated users can upload generated documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'generated-documents');

CREATE POLICY "Authenticated users can view generated documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'generated-documents');

CREATE POLICY "Authenticated users can update generated documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'generated-documents');

CREATE POLICY "Authenticated users can delete generated documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'generated-documents');

-- 4. Allow public read access for generated documents (for sharing/downloading)
CREATE POLICY "Public can view generated documents"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'generated-documents');