-- Update register_crew_member to validate bus existence
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
    v_clean_bus TEXT;
BEGIN
    v_clean_nic := REPLACE(UPPER(p_nic_number), ' ', '');

    -- Check if already exists (ignoring spaces)
    IF EXISTS (SELECT 1 FROM public.staff_registry WHERE REPLACE(UPPER(nic_number), ' ', '') = v_clean_nic) THEN
        RETURN jsonb_build_object('success', false, 'error', 'NIC already registered');
    END IF;

    -- Validate Bus existence if provided
    IF p_assigned_bus IS NOT NULL AND p_assigned_bus != '' THEN
        v_clean_bus := REPLACE(UPPER(p_assigned_bus), ' ', '');
        IF NOT EXISTS (SELECT 1 FROM public.buses WHERE REPLACE(UPPER(bus_no), ' ', '') = v_clean_bus) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bus number does not exist in the system. Please check the assigned bus number.');
        END IF;
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
