-- Simple approach: Just create the admin role for an existing user if needed
-- Or create a test user properly

-- First check if admin@test.com already exists
DO $$
DECLARE
    existing_user_id uuid;
    new_user_id uuid;
BEGIN
    -- Check if user already exists
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@test.com';
    
    IF existing_user_id IS NOT NULL THEN
        -- User exists, just ensure they have admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (existing_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role assigned to existing user: %', existing_user_id;
    ELSE
        -- Create new user
        new_user_id := gen_random_uuid();
        
        -- Insert into auth.users
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
            raw_user_meta_data
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
            '{"first_name": "Test", "last_name": "Admin"}'::jsonb
        );

        -- The trigger should create the profile, but let's make sure
        -- Wait a moment for trigger to execute, then assign role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_user_id, 'admin'::app_role);
        
        RAISE NOTICE 'Created new admin user: %', new_user_id;
    END IF;
END $$;