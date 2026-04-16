-- Update the grant_role_based_permissions function to include seasonal_themes for admins
CREATE OR REPLACE FUNCTION public.grant_role_based_permissions()
RETURNS TRIGGER AS $$
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
        'nsp_daily_sales', 'nsp_summary', 'governance_calendar', 'seasonal_themes'
      ];
    
    WHEN 'admin' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'daily_trips', 'fleet_management', 
        'maintenance', 'insurance', 'staff_performance',
        'route_permits', 'driver_training', 'real_time_tracking', 
        'driver_allocation', 'school_bus_service', 
        'complaints', 'special_hire', 'document_manager', 'feedback',
        'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
        'nsp_daily_sales', 'nsp_summary', 'seasonal_themes'
      ];
    
    WHEN 'supervisor' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'daily_trips', 'fleet_management', 
        'maintenance', 'route_permits', 'driver_training', 
        'real_time_tracking', 'driver_allocation', 'staff_attendance',
        'school_bus_service', 'complaints', 'special_hire'
      ];
    
    WHEN 'staff' THEN
      pages_to_grant := ARRAY[]::text[];
    
    WHEN 'finance' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'special_hire', 
        'yutong_quotations', 'nsp_daily_sales', 'nsp_summary'
      ];
    
    WHEN 'driver' THEN
      pages_to_grant := ARRAY['dashboard', 'daily_trips'];
    
    ELSE
      pages_to_grant := ARRAY[]::text[];
  END CASE;
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant seasonal_themes access to existing admin users
INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
SELECT 
  ur.user_id,
  'seasonal_themes',
  true,
  ur.user_id
FROM public.user_roles ur
WHERE ur.role IN ('super_admin', 'admin')
ON CONFLICT (user_id, page_identifier) 
DO UPDATE SET has_access = true, granted_at = now();