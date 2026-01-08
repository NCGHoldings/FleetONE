-- Ensure documents bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, 
  20971520, -- 20MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- Create RLS policies for documents storage
CREATE POLICY "Authenticated users can view documents" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'documents');

CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (auth.role() = 'authenticated' AND bucket_id = 'documents');

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = 'documents');