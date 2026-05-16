-- Migration: Update register_crew_member RPC to accept employment_type

-- Add employment_type column to staff_registry
ALTER TABLE public.staff_registry ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent';

CREATE OR REPLACE FUNCTION public.register_crew_member(
    p_full_name TEXT,
    p_calling_name TEXT,
    p_nic_number TEXT,
    p_contact_number TEXT,
    p_pin_code TEXT,
    p_staff_type TEXT,
    p_salary_type TEXT,
    p_employment_type TEXT DEFAULT 'permanent'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_crew_data RECORD;
BEGIN
    -- Check if already exists
    IF EXISTS (SELECT 1 FROM public.staff_registry WHERE nic_number = p_nic_number) THEN
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

GRANT EXECUTE ON FUNCTION public.register_crew_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
