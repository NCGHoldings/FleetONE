-- Create a simple test admin account that will work with the existing system
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- First let's create a simple auth entry (this should trigger the handle_new_user function)
    test_user_id := gen_random_uuid();
    
    -- Insert basic auth user
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
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',  
        'authenticated',
        'test@admin.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(), 
        NOW(),
        '{"first_name": "Admin", "last_name": "User"}'::jsonb
    );
    
    RAISE NOTICE 'Created user with ID: %', test_user_id;
END $$;