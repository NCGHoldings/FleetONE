-- Migration: Fix crew login and registration NIC constraints

-- 1. Fix login function to use exact matching (ignoring spaces and case) instead of partial ILIKE matches
DROP FUNCTION IF EXISTS public.login_crew_member(TEXT);

CREATE OR REPLACE FUNCTION public.login_crew_member(p_nic_number TEXT)
RETURNS TABLE (
    id UUID,
    staff_name TEXT,
    staff_type public.staff_type,
    nic_number TEXT,
    contact_number TEXT,
    pin_code TEXT,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT sr.id, sr.staff_name, sr.staff_type, sr.nic_number, sr.contact_number, sr.pin_code, sr.is_active
    FROM public.staff_registry sr
    WHERE REPLACE(UPPER(sr.nic_number), ' ', '') = REPLACE(UPPER(p_nic_number), ' ', '')
    ORDER BY sr.created_at DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_crew_member(TEXT) TO anon;

-- 2. Update registration to prevent space-bypassed duplicates
DROP FUNCTION IF EXISTS public.register_crew_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_crew_member(
    p_full_name TEXT,
    p_calling_name TEXT,
    p_nic_number TEXT,
    p_contact_number TEXT,
    p_pin_code TEXT,
    p_staff_type TEXT,
    p_salary_type TEXT,
    p_employment_type TEXT,
    p_assigned_bus TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_crew_data RECORD;
    v_clean_nic TEXT;
BEGIN
    v_clean_nic := REPLACE(UPPER(p_nic_number), ' ', '');

    -- Check if already exists (ignoring spaces)
    IF EXISTS (SELECT 1 FROM public.staff_registry WHERE REPLACE(UPPER(nic_number), ' ', '') = v_clean_nic) THEN
        RETURN jsonb_build_object('success', false, 'error', 'NIC already registered');
    END IF;

    -- Insert into staff_registry
    INSERT INTO public.staff_registry (
        staff_name,
        calling_name,
        nic_number,
        contact_number,
        pin_code,
        staff_type,
        salary_type,
        employment_type,
        assigned_bus,
        is_active
    ) VALUES (
        p_full_name,
        p_calling_name,
        p_nic_number,
        p_contact_number,
        p_pin_code,
        p_staff_type::public.staff_type,
        p_salary_type::public.salary_type,
        p_employment_type,
        p_assigned_bus,
        true
    ) RETURNING id, staff_name, staff_type, nic_number, contact_number INTO v_crew_data;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_crew_data.id,
            'staff_name', v_crew_data.staff_name,
            'staff_type', v_crew_data.staff_type,
            'nic_number', v_crew_data.nic_number,
            'contact_number', v_crew_data.contact_number
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_crew_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
