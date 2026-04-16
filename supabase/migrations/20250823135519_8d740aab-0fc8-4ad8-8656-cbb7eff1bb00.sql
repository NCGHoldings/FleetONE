-- Promote the very first registered user back to super_admin
WITH first_user AS (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
),
updated AS (
  UPDATE public.user_roles ur
  SET role = 'super_admin'
  FROM first_user fu
  WHERE ur.user_id = fu.id
  RETURNING ur.user_id
)
INSERT INTO public.user_roles (user_id, role)
SELECT fu.id, 'super_admin'::app_role
FROM first_user fu
WHERE NOT EXISTS (
  SELECT 1 FROM updated u WHERE u.user_id = fu.id
) AND NOT EXISTS (
  SELECT 1 FROM public.user_roles r 
  WHERE r.user_id = fu.id AND r.role = 'super_admin'
);
