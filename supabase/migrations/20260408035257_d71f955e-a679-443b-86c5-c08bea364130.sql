
CREATE POLICY "Anon can upload bus documents for migration"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'bus-documents');
