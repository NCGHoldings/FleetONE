-- ==================================================================
-- NCG FLEETFLOW SECURITY HARDENING SCRIPT (PHASE 3 - STORAGE)
-- Locks down Storage Bucket vulnerabilities and anonymous uploads
-- ==================================================================

-- Disable Anonymous Uploads
DROP POLICY IF EXISTS "Anon can upload bus documents for migration" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous parents can upload receipts" ON storage.objects;

-- Harden Invoices (Yutong, Sinotruk, LightVehicle)
-- Replace "Public can view" and authenticated uploads with Super Admin only.

-- Drop all open policies for Sinotruk
DROP POLICY IF EXISTS "Public can view sinotruck invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload sinotruck invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update sinotruck invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete sinotruck invoices" ON storage.objects;

-- Drop all open policies for Light Vehicle
DROP POLICY IF EXISTS "Allow authenticated users to read light vehicle invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload light vehicle invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update light vehicle invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete light vehicle invoices" ON storage.objects;

-- Drop all open policies for Yutong
DROP POLICY IF EXISTS "yutong_invoices_select" ON storage.objects;
DROP POLICY IF EXISTS "yutong_invoices_insert" ON storage.objects;
DROP POLICY IF EXISTS "yutong_invoices_update" ON storage.objects;
DROP POLICY IF EXISTS "yutong_invoices_delete" ON storage.objects;


-- Add Secure Policies for Invoices (Read Only for Super Admin for now to prevent leaks)
-- Sinotruk Policies
DROP POLICY IF EXISTS "Super admin read sinotruck invoices" ON storage.objects;
CREATE POLICY "Super admin read sinotruck invoices" ON storage.objects FOR SELECT USING (bucket_id = 'sinotruck-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin insert sinotruck invoices" ON storage.objects;
CREATE POLICY "Super admin insert sinotruck invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sinotruck-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin update sinotruck invoices" ON storage.objects;
CREATE POLICY "Super admin update sinotruck invoices" ON storage.objects FOR UPDATE USING (bucket_id = 'sinotruck-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin delete sinotruck invoices" ON storage.objects;
CREATE POLICY "Super admin delete sinotruck invoices" ON storage.objects FOR DELETE USING (bucket_id = 'sinotruck-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));

-- Yutong Policies
DROP POLICY IF EXISTS "Super admin read yutong invoices" ON storage.objects;
CREATE POLICY "Super admin read yutong invoices" ON storage.objects FOR SELECT USING (bucket_id = 'yutong-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin insert yutong invoices" ON storage.objects;
CREATE POLICY "Super admin insert yutong invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'yutong-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin update yutong invoices" ON storage.objects;
CREATE POLICY "Super admin update yutong invoices" ON storage.objects FOR UPDATE USING (bucket_id = 'yutong-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin delete yutong invoices" ON storage.objects;
CREATE POLICY "Super admin delete yutong invoices" ON storage.objects FOR DELETE USING (bucket_id = 'yutong-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));

-- Light Vehicle Policies
DROP POLICY IF EXISTS "Super admin read lv invoices" ON storage.objects;
CREATE POLICY "Super admin read lv invoices" ON storage.objects FOR SELECT USING (bucket_id = 'lightvehicle-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin insert lv invoices" ON storage.objects;
CREATE POLICY "Super admin insert lv invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lightvehicle-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin update lv invoices" ON storage.objects;
CREATE POLICY "Super admin update lv invoices" ON storage.objects FOR UPDATE USING (bucket_id = 'lightvehicle-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin delete lv invoices" ON storage.objects;
CREATE POLICY "Super admin delete lv invoices" ON storage.objects FOR DELETE USING (bucket_id = 'lightvehicle-invoices' AND public.has_role(auth.uid(), 'super_admin'::app_role));


-- Harden Payment Proofs
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;

DROP POLICY IF EXISTS "Super admin view payment proofs" ON storage.objects;
CREATE POLICY "Super admin view payment proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin insert payment proofs" ON storage.objects;
CREATE POLICY "Super admin insert payment proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin update payment proofs" ON storage.objects;
CREATE POLICY "Super admin update payment proofs" ON storage.objects FOR UPDATE USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "Super admin delete payment proofs" ON storage.objects;
CREATE POLICY "Super admin delete payment proofs" ON storage.objects FOR DELETE USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'super_admin'::app_role));


-- Harden Staff Registry Documents
DROP POLICY IF EXISTS "auth_select_staff_registry" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_staff_registry" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_staff_registry" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_staff_registry" ON storage.objects;

DROP POLICY IF EXISTS "HR admin view staff registry" ON storage.objects;
CREATE POLICY "HR admin view staff registry" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "HR admin insert staff registry" ON storage.objects;
CREATE POLICY "HR admin insert staff registry" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "HR admin update staff registry" ON storage.objects;
CREATE POLICY "HR admin update staff registry" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry' AND public.has_role(auth.uid(), 'super_admin'::app_role));
DROP POLICY IF EXISTS "HR admin delete staff registry" ON storage.objects;
CREATE POLICY "HR admin delete staff registry" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry' AND public.has_role(auth.uid(), 'super_admin'::app_role));
