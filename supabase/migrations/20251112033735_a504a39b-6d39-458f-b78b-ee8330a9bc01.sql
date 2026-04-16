-- Storage bucket for conductor submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conductor-submissions',
  'conductor-submissions',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for conductor submissions
CREATE POLICY "Anyone can upload conductor submissions"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'conductor-submissions');

CREATE POLICY "Authenticated users can view conductor submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'conductor-submissions');

CREATE POLICY "Admins can delete conductor submissions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'conductor-submissions' 
  AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'supervisor')
    )
  )
);

-- Initialize default settings for data entry deadline
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('data_entry_deadline_hours', '6', 'Hours after trip date to allow data entry')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('deadline_enforcement_enabled', 'true', 'Enable deadline enforcement for data entry')
ON CONFLICT (setting_key) DO NOTHING;

-- Add new page permissions to the system
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Grant permissions to all super_admin users
  FOR admin_user_id IN 
    SELECT DISTINCT user_id 
    FROM user_roles 
    WHERE role = 'super_admin'
  LOOP
    INSERT INTO user_page_permissions (user_id, page_identifier, has_access, granted_by)
    VALUES 
      (admin_user_id, 'conductor_submissions', true, admin_user_id),
      (admin_user_id, 'late_entry_requests', true, admin_user_id),
      (admin_user_id, 'data_entry_settings', true, admin_user_id)
    ON CONFLICT (user_id, page_identifier) DO UPDATE
    SET has_access = true, granted_at = now();
  END LOOP;

  -- Grant conductor_submissions to admins and supervisors
  FOR admin_user_id IN 
    SELECT DISTINCT user_id 
    FROM user_roles 
    WHERE role IN ('admin', 'supervisor')
  LOOP
    INSERT INTO user_page_permissions (user_id, page_identifier, has_access, granted_by)
    VALUES 
      (admin_user_id, 'conductor_submissions', true, admin_user_id)
    ON CONFLICT (user_id, page_identifier) DO UPDATE
    SET has_access = true, granted_at = now();
  END LOOP;

  -- Grant late_entry_requests to admins only
  FOR admin_user_id IN 
    SELECT DISTINCT user_id 
    FROM user_roles 
    WHERE role = 'admin'
  LOOP
    INSERT INTO user_page_permissions (user_id, page_identifier, has_access, granted_by)
    VALUES 
      (admin_user_id, 'late_entry_requests', true, admin_user_id)
    ON CONFLICT (user_id, page_identifier) DO UPDATE
    SET has_access = true, granted_at = now();
  END LOOP;
END $$;