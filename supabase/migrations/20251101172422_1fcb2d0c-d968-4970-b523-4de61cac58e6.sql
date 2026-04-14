-- Update grant_role_based_permissions to give staff role ZERO pages
CREATE OR REPLACE FUNCTION public.grant_role_based_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  pages_to_grant text[];
BEGIN
  CASE NEW.role
    WHEN 'super_admin' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'daily_trips', 'fleet_management', 
        'maintenance', 'insurance', 'staff_management', 'staff_performance',
        'route_permits', 'driver_training', 'real_time_tracking', 
        'driver_allocation', 'staff_attendance', 'school_bus_service', 
        'complaints', 'special_hire', 'document_manager', 'feedback',
        'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
        'nsp_daily_sales', 'nsp_summary', 'governance_calendar'
      ];
    
    WHEN 'admin' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'daily_trips', 'fleet_management', 
        'maintenance', 'insurance', 'staff_performance',
        'route_permits', 'driver_training', 'real_time_tracking', 
        'driver_allocation', 'school_bus_service', 
        'complaints', 'special_hire', 'document_manager', 'feedback',
        'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
        'nsp_daily_sales', 'nsp_summary'
      ];
    
    WHEN 'supervisor' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'daily_trips', 'fleet_management', 
        'maintenance', 'route_permits', 'driver_training', 
        'real_time_tracking', 'driver_allocation', 'staff_attendance',
        'school_bus_service', 'complaints', 'special_hire'
      ];
    
    WHEN 'staff' THEN
      -- ZERO ACCESS: Staff gets no pages by default (super admin must grant manually)
      pages_to_grant := ARRAY[]::text[];
    
    WHEN 'finance' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'special_hire', 
        'yutong_quotations', 'nsp_daily_sales', 'nsp_summary'
      ];
    
    WHEN 'driver' THEN
      pages_to_grant := ARRAY['dashboard', 'daily_trips'];
    
    ELSE
      -- Unknown role, grant minimal access
      pages_to_grant := ARRAY[]::text[];
  END CASE;
  
  -- Only insert if there are pages to grant
  IF array_length(pages_to_grant, 1) > 0 THEN
    INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
    SELECT 
      NEW.user_id,
      unnest(pages_to_grant),
      true,
      NEW.user_id
    ON CONFLICT (user_id, page_identifier) 
    DO UPDATE SET 
      has_access = true, 
      granted_at = now(),
      granted_by = EXCLUDED.granted_by;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Revoke auto-granted pages from existing staff-only users
UPDATE user_page_permissions
SET has_access = false
WHERE page_identifier IN ('dashboard', 'daily_trips', 'school_bus_service')
  AND user_id IN (
    -- Find users who ONLY have 'staff' role (no other roles)
    SELECT user_id 
    FROM user_roles 
    WHERE role = 'staff'
    GROUP BY user_id
    HAVING COUNT(*) = 1
  );