-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new comprehensive user creation handler
CREATE OR REPLACE FUNCTION public.handle_new_user_with_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  emp_id TEXT;
BEGIN
  -- Check if this user was created via a valid invite
  SELECT * INTO invite_record
  FROM public.pending_invites
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now();
  
  -- Determine employee ID
  IF invite_record.id IS NOT NULL THEN
    -- Valid invite found - use data from invite
    emp_id := NULL; -- Will be auto-generated
    
    -- Create profile with invite data
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      phone,
      email,
      employee_id,
      hire_date,
      status
    ) VALUES (
      NEW.id,
      COALESCE(invite_record.first_name, split_part(NEW.email, '@', 1)),
      COALESCE(invite_record.last_name, ''),
      invite_record.phone,
      NEW.email,
      emp_id,
      CURRENT_DATE,
      'active'::user_status
    );
    
    -- Assign role from invite
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.initial_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Always add staff role as baseline
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Mark invite as accepted
    UPDATE public.pending_invites
    SET status = 'accepted',
        updated_at = now()
    WHERE id = invite_record.id;
    
  ELSE
    -- NO VALID INVITE - Create minimal profile (unauthorized account)
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      email,
      employee_id,
      hire_date,
      status
    ) VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1),
      'UNAUTHORIZED',
      NEW.email,
      NULL,
      CURRENT_DATE,
      'active'::user_status
    );
    
    -- Only assign staff role (minimal access)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log unauthorized account creation
    RAISE WARNING 'SECURITY: Unauthorized account created for email: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_invite();

-- Create function to deny all page access by default for new users
CREATE OR REPLACE FUNCTION public.initialize_zero_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_pages TEXT[] := ARRAY[
    'dashboard', 'customers', 'daily_trips', 'fleet_management', 
    'maintenance', 'insurance', 'staff_management', 'staff_performance',
    'route_permits', 'driver_training', 'real_time_tracking', 
    'driver_allocation', 'staff_attendance', 'school_bus_service', 
    'complaints', 'special_hire', 'document_manager', 'feedback',
    'yutong_quotations', 'yutong_bus_models', 'yutong_addons',
    'nsp_daily_sales', 'nsp_summary', 'governance_calendar'
  ];
  page TEXT;
BEGIN
  -- Create denied entries for all pages (super admin must explicitly grant)
  FOREACH page IN ARRAY all_pages
  LOOP
    INSERT INTO public.user_page_permissions (user_id, page_identifier, has_access, granted_by)
    VALUES (NEW.user_id, page, false, NEW.user_id)
    ON CONFLICT (user_id, page_identifier) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to initialize zero access after profile creation
CREATE TRIGGER on_profile_created_initialize_zero_access
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_zero_access();

-- Drop the old assign_default_staff_role trigger on profiles
-- (roles are now handled by handle_new_user_with_invite)
DROP TRIGGER IF EXISTS assign_default_staff_role_trigger ON public.profiles;