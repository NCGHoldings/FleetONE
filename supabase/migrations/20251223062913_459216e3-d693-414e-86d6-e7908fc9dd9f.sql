-- Add storage policies for payment-proofs bucket to allow authenticated users to upload/view payment proofs

-- Allow authenticated users to upload payment proofs
CREATE POLICY "payment_proofs_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow authenticated users to view payment proofs
CREATE POLICY "payment_proofs_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users to update their uploaded proofs
CREATE POLICY "payment_proofs_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow authenticated users to delete payment proofs
CREATE POLICY "payment_proofs_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');