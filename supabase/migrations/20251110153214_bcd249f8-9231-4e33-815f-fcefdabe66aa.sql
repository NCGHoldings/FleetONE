-- Update the grant_role_based_permissions function to include accounting page
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
        'nsp_daily_sales', 'nsp_summary', 'governance_calendar', 'seasonal_themes',
        'accounting'
      ];
    
    WHEN 'admin' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'daily_trips', 'fleet_management', 
        'maintenance', 'insurance', 'staff_performance',
        'route_permits', 'driver_training', 'real_time_tracking', 
        'driver_allocation', 'school_bus_service', 
        'complaints', 'special_hire', 'document_manager', 'feedback',
        'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
        'nsp_daily_sales', 'nsp_summary', 'seasonal_themes',
        'accounting'
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
        'yutong_quotations', 'nsp_daily_sales', 'nsp_summary',
        'accounting'
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
$function$;