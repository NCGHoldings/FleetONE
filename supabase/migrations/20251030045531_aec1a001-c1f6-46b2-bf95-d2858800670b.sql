-- =====================================================
-- Role-Based Access System with Auto-Staff Assignment (Fixed)
-- =====================================================

-- Step 1: Create function to automatically assign staff role to new users
CREATE OR REPLACE FUNCTION public.assign_default_staff_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically assign staff role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profile creation
DROP TRIGGER IF EXISTS on_profile_created_assign_staff ON public.profiles;
CREATE TRIGGER on_profile_created_assign_staff
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_staff_role();

-- Step 2: Create function to grant role-based permissions
CREATE OR REPLACE FUNCTION public.grant_role_based_permissions()
RETURNS TRIGGER AS $$
DECLARE
  pages_to_grant text[];
BEGIN
  -- Determine which pages to grant based on role
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
      pages_to_grant := ARRAY[
        'dashboard', 'daily_trips', 'school_bus_service'
      ];
    
    WHEN 'finance' THEN
      pages_to_grant := ARRAY[
        'dashboard', 'customers', 'special_hire', 
        'yutong_quotations', 'nsp_daily_sales', 'nsp_summary'
      ];
    
    WHEN 'driver' THEN
      pages_to_grant := ARRAY['dashboard', 'daily_trips'];
    
    ELSE
      -- Unknown role, grant minimal access
      pages_to_grant := ARRAY['dashboard'];
  END CASE;
  
  -- Grant the pages (upsert to handle both inserts and updates)
  INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
  SELECT 
    NEW.user_id,
    unnest(pages_to_grant),
    true,
    NEW.user_id -- Self-granted via role assignment
  ON CONFLICT (user_id, page_identifier) 
  DO UPDATE SET 
    has_access = true, 
    granted_at = now(),
    granted_by = EXCLUDED.granted_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on role insertion
DROP TRIGGER IF EXISTS on_role_assigned_grant_permissions ON public.user_roles;
CREATE TRIGGER on_role_assigned_grant_permissions
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_role_based_permissions();

-- Create trigger on role update
DROP TRIGGER IF EXISTS on_role_updated_grant_permissions ON public.user_roles;
CREATE TRIGGER on_role_updated_grant_permissions
  AFTER UPDATE OF role ON public.user_roles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.grant_role_based_permissions();

-- Step 3: Seed permissions for existing users
-- First, assign staff role to users who have NO roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.user_id, 'staff'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant permissions based on existing roles (deduplicated)
-- Use DISTINCT ON to get only one row per user_id, page_id combination
INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
SELECT DISTINCT ON (user_id, page_id)
  user_id,
  page_id,
  true,
  user_id
FROM (
  SELECT 
    ur.user_id,
    unnest(
      CASE ur.role
        WHEN 'super_admin' THEN ARRAY[
          'dashboard', 'customers', 'daily_trips', 'fleet_management', 
          'maintenance', 'insurance', 'staff_management', 'staff_performance',
          'route_permits', 'driver_training', 'real_time_tracking', 
          'driver_allocation', 'staff_attendance', 'school_bus_service', 
          'complaints', 'special_hire', 'document_manager', 'feedback',
          'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
          'nsp_daily_sales', 'nsp_summary', 'governance_calendar'
        ]
        WHEN 'admin' THEN ARRAY[
          'dashboard', 'customers', 'daily_trips', 'fleet_management', 
          'maintenance', 'insurance', 'staff_performance',
          'route_permits', 'driver_training', 'real_time_tracking', 
          'driver_allocation', 'school_bus_service', 
          'complaints', 'special_hire', 'document_manager', 'feedback',
          'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
          'nsp_daily_sales', 'nsp_summary'
        ]
        WHEN 'supervisor' THEN ARRAY[
          'dashboard', 'daily_trips', 'fleet_management', 
          'maintenance', 'route_permits', 'driver_training', 
          'real_time_tracking', 'driver_allocation', 'staff_attendance',
          'school_bus_service', 'complaints', 'special_hire'
        ]
        WHEN 'staff' THEN ARRAY[
          'dashboard', 'daily_trips', 'school_bus_service'
        ]
        WHEN 'finance' THEN ARRAY[
          'dashboard', 'customers', 'special_hire', 
          'yutong_quotations', 'nsp_daily_sales', 'nsp_summary'
        ]
        WHEN 'driver' THEN ARRAY[
          'dashboard', 'daily_trips'
        ]
        ELSE ARRAY['dashboard']
      END
    ) as page_id
  FROM public.user_roles ur
) AS role_pages
ON CONFLICT (user_id, page_identifier) 
DO UPDATE SET 
  has_access = true, 
  granted_at = now(),
  granted_by = EXCLUDED.granted_by;