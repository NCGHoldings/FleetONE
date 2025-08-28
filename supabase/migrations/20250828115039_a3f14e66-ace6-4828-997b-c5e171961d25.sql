-- First, let's create a user with email 'admin@test.com' using the signup process
-- We'll do this by creating a trigger that runs on new user creation

-- Create a temporary function to set up our admin user
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin@test.com already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@test.com';
  
  -- Only proceed if user doesn't exist
  IF admin_user_id IS NULL THEN
    -- This will be handled by the signup process from the frontend
    -- For now, we'll just prepare the role assignment for when the user signs up
    
    -- Create a temporary table to store pending admin setup
    CREATE TEMP TABLE IF NOT EXISTS pending_admin_setup (
      email text PRIMARY KEY,
      should_be_admin boolean DEFAULT true
    );
    
    INSERT INTO pending_admin_setup (email) 
    VALUES ('admin@test.com')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$;

-- Run the function
SELECT create_admin_user();

-- Create a modified handle_new_user function that checks for admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_first_user BOOLEAN;
  should_be_admin BOOLEAN DEFAULT FALSE;
BEGIN
  -- Check if this is the first user by counting existing profiles
  SELECT COUNT(*) = 0 FROM public.profiles INTO is_first_user;
  
  -- Check if this email should be admin
  IF NEW.email = 'admin@test.com' THEN
    should_be_admin := TRUE;
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    employee_id,
    hire_date,
    status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Test'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Admin'),
    'ADMIN001',
    CURRENT_DATE,
    'active'::user_status
  );
  
  -- Assign role
  IF is_first_user OR should_be_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;