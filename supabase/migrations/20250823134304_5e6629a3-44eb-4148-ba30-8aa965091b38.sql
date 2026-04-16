-- Update the first user to super_admin role
UPDATE public.user_roles 
SET role = 'super_admin'
WHERE user_id = '82b15c32-1b42-4740-bc3b-2e9f6603e875';

-- Fix the handle_new_user function to properly check for first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user by counting existing profiles
  SELECT COUNT(*) = 0 FROM public.profiles INTO is_first_user;
  
  -- Insert profile
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    employee_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    'EMP' || LPAD(EXTRACT(epoch FROM NOW())::TEXT, 10, '0')
  );
  
  -- Assign role
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$function$;