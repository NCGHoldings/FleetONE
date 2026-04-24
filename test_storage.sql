CREATE OR REPLACE VIEW public.v_all_system_documents AS
SELECT 
    id,
    bucket_id,
    name as file_path,
    split_part(name, '/', array_length(string_to_array(name, '/'), 1)) as file_name,
    metadata->>'mimetype' as file_type,
    (metadata->>'size')::numeric as file_size,
    created_at as uploaded_at,
    updated_at
FROM storage.objects
WHERE bucket_id IN ('documents', 'conductor-submissions', 'payment-proofs', 'fleet-documents', 'generated-documents');

GRANT SELECT ON public.v_all_system_documents TO authenticated, anon;
