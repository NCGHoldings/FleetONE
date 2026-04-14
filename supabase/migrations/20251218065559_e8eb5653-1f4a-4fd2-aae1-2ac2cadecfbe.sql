-- Storage RLS Policies for Image Upload Buckets

-- =============================================
-- SINOTRUCK TRUCK MODELS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload to sinotruck-truck-models
CREATE POLICY "sinotruck_upload_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sinotruck-truck-models');

-- Allow authenticated users to read from sinotruck-truck-models
CREATE POLICY "sinotruck_upload_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'sinotruck-truck-models');

-- Allow authenticated users to update in sinotruck-truck-models
CREATE POLICY "sinotruck_upload_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'sinotruck-truck-models')
WITH CHECK (bucket_id = 'sinotruck-truck-models');

-- Allow authenticated users to delete from sinotruck-truck-models
CREATE POLICY "sinotruck_upload_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'sinotruck-truck-models');

-- =============================================
-- YUTONG BUS MODELS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload to yutong-bus-models
CREATE POLICY "yutong_upload_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'yutong-bus-models');

-- Allow authenticated users to read from yutong-bus-models
CREATE POLICY "yutong_upload_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'yutong-bus-models');

-- Allow authenticated users to update in yutong-bus-models
CREATE POLICY "yutong_upload_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'yutong-bus-models')
WITH CHECK (bucket_id = 'yutong-bus-models');

-- Allow authenticated users to delete from yutong-bus-models
CREATE POLICY "yutong_upload_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'yutong-bus-models');

-- =============================================
-- AVATARS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload to avatars
CREATE POLICY "avatars_upload_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read from avatars (profile pictures should be viewable)
CREATE POLICY "avatars_public_select" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to update their avatars
CREATE POLICY "avatars_upload_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to delete avatars
CREATE POLICY "avatars_upload_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');