-- Zero-Trust Page Access System
-- This migration implements automatic permission seeding for Super Admins

-- Function to grant all page permissions to Super Admins automatically
CREATE OR REPLACE FUNCTION public.grant_superadmin_page_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if the new role is super_admin
  IF NEW.role = 'super_admin' THEN
    -- Grant all page permissions to the super admin
    INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
    SELECT 
      NEW.user_id,
      unnest(ARRAY[
        'dashboard',
        'customers',
        'daily_trips',
        'fleet_management',
        'maintenance',
        'insurance',
        'staff_management',
        'staff_performance',
        'route_permits',
        'driver_training',
        'real_time_tracking',
        'driver_allocation',
        'staff_attendance',
        'school_bus_service',
        'complaints',
        'special_hire',
        'document_manager',
        'yutong_quotations',
        'nsp_daily_sales',
        'nsp_summary',
        'governance_calendar'
      ]) as page_identifier,
      true,
      NEW.user_id
    ON CONFLICT (user_id, page_identifier) 
    DO UPDATE SET has_access = true, granted_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically grant permissions when super_admin role is assigned
CREATE TRIGGER on_superadmin_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'super_admin')
  EXECUTE FUNCTION public.grant_superadmin_page_permissions();

-- Optional: Grant permissions to existing super admins (run once)
INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
SELECT 
  ur.user_id,
  page_id,
  true,
  ur.user_id
FROM public.user_roles ur
CROSS JOIN unnest(ARRAY[
  'dashboard', 'customers', 'daily_trips', 'fleet_management', 
  'maintenance', 'insurance', 'staff_management', 'staff_performance',
  'route_permits', 'driver_training', 'real_time_tracking', 
  'driver_allocation', 'staff_attendance', 'school_bus_service', 
  'complaints', 'special_hire', 'document_manager', 
  'yutong_quotations', 'nsp_daily_sales', 'nsp_summary', 'governance_calendar'
]) as page_id
WHERE ur.role = 'super_admin'
ON CONFLICT (user_id, page_identifier) 
DO UPDATE SET has_access = true, granted_at = now();