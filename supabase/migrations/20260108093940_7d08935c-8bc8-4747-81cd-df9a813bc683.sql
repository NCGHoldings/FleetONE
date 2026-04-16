-- Add marketing page permissions for all existing users
INSERT INTO user_page_permissions (user_id, page_identifier, has_access, granted_by)
SELECT 
  u.id as user_id, 
  p.page_id as page_identifier, 
  true as has_access,
  u.id as granted_by
FROM auth.users u
CROSS JOIN (VALUES 
  ('marketing_dashboard'),
  ('marketing_job_requests'),
  ('marketing_tasks'),
  ('marketing_projects'),
  ('marketing_team'),
  ('marketing_social')
) AS p(page_id)
ON CONFLICT (user_id, page_identifier) DO NOTHING;