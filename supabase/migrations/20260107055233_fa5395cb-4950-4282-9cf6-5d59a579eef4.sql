-- Drop existing restrictive policies
DROP POLICY IF EXISTS "yutong_invoices_select" ON storage.objects;
DROP POLICY IF EXISTS "yutong_invoices_insert" ON storage.objects;
DROP POLICY IF EXISTS "yutong_invoices_update" ON storage.objects;
DROP POLICY IF EXISTS "yutong_invoices_delete" ON storage.objects;

-- Recreate policies matching working patterns (without auth restriction)
CREATE POLICY "yutong_invoices_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'yutong-invoices');

CREATE POLICY "yutong_invoices_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'yutong-invoices');

CREATE POLICY "yutong_invoices_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'yutong-invoices')
  WITH CHECK (bucket_id = 'yutong-invoices');

CREATE POLICY "yutong_invoices_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'yutong-invoices');