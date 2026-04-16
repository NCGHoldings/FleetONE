-- Fix payment-proofs storage bucket RLS policies
-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and finance/admin can read proofs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and finance/admin can delete proofs" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_delete_policy" ON storage.objects;

-- Create clean, unified policies for payment-proofs bucket
CREATE POLICY "payment_proofs_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_authenticated_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');