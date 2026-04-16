-- Fix the handle_new_user_with_invite function to remove email column
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
    
    -- Create profile with invite data (WITHOUT email column)
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      phone,
      employee_id,
      hire_date,
      status
    ) VALUES (
      NEW.id,
      COALESCE(invite_record.first_name, split_part(NEW.email, '@', 1)),
      COALESCE(invite_record.last_name, ''),
      invite_record.phone,
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
    -- NO VALID INVITE - Create minimal profile (WITHOUT email column)
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      employee_id,
      hire_date,
      status
    ) VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1),
      'UNAUTHORIZED',
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