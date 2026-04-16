-- Create a new admin user
-- Note: This creates the user in the auth.users table and related tables

-- First, let's create a test admin user account
-- We'll need to insert into auth.users, profiles, and user_roles tables

-- Insert into auth.users (this is typically handled by Supabase Auth, but we can do it manually for testing)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Get the user ID we just created
-- Insert profile for the admin user
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@test.com'
)
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  employee_id,
  email,
  phone,
  hire_date,
  status
) 
SELECT 
  id,
  'Test',
  'Admin',
  'ADMIN001',
  'admin@test.com',
  '+94701234567',
  CURRENT_DATE,
  'active'
FROM new_user;

-- Assign admin role to the user
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@test.com'
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM new_user;