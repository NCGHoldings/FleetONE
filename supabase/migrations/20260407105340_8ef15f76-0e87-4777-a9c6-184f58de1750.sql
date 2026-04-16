
-- Storage policies for feedback_complaints prefix
CREATE POLICY "auth_insert_feedback_complaints"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'feedback_complaints');

CREATE POLICY "auth_select_feedback_complaints"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'feedback_complaints');

CREATE POLICY "auth_update_feedback_complaints"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'feedback_complaints');

CREATE POLICY "auth_delete_feedback_complaints"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'feedback_complaints');

-- Storage policies for insurance_records prefix
CREATE POLICY "auth_insert_insurance_records"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'insurance_records');

CREATE POLICY "auth_select_insurance_records"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'insurance_records');

CREATE POLICY "auth_update_insurance_records"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'insurance_records');

CREATE POLICY "auth_delete_insurance_records"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'insurance_records');

-- Storage policies for staff_registry prefix
CREATE POLICY "auth_insert_staff_registry"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry');

CREATE POLICY "auth_select_staff_registry"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry');

CREATE POLICY "auth_update_staff_registry"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry');

CREATE POLICY "auth_delete_staff_registry"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'staff_registry');
