-- Allow authenticated users to upload to health-checks folder for system monitoring
CREATE POLICY "health_checks_insert" ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' 
  AND name LIKE 'health-checks/%'
  AND auth.role() = 'authenticated'
);

-- Allow reading health check files
CREATE POLICY "health_checks_select" ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND name LIKE 'health-checks/%'
  AND auth.role() = 'authenticated'
);

-- Allow deleting health check files (for cleanup)
CREATE POLICY "health_checks_delete" ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' 
  AND name LIKE 'health-checks/%'
  AND auth.role() = 'authenticated'
);