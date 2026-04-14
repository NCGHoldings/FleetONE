-- Create admin user using a different approach
-- Since we have a handle_new_user trigger, let's just create the user through auth signup
-- and then manually assign admin role

-- First, let's create a user manually in auth.users (simplified approach)
DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
BEGIN
    -- Insert into auth.users table
    INSERT INTO auth.users (
        id,
        instance_id,
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
        recovery_token,
        raw_user_meta_data,
        raw_app_meta_data
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
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
        '',
        '{"first_name": "Test", "last_name": "Admin"}'::jsonb,
        '{}'::jsonb
    );

    -- Insert profile manually since the trigger might not work
    INSERT INTO public.profiles (
        user_id,
        employee_id,
        first_name,
        last_name,
        phone,
        hire_date,
        status
    ) VALUES (
        new_user_id,
        'ADMIN001',
        'Test',
        'Admin',
        '+94701234567',
        CURRENT_DATE,
        'active'::user_status
    );

    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin'::app_role);
    
    RAISE NOTICE 'Created admin user with ID: %', new_user_id;
END $$;