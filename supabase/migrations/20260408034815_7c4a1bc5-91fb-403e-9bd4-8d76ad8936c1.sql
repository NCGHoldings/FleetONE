
-- Create the bus-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bus-documents', 'bus-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for bus documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'bus-documents');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload bus documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bus-documents');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update bus documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bus-documents');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete bus documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bus-documents');
