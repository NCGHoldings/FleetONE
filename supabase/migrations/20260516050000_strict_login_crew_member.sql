-- Migration: Make login_crew_member strict to prevent partial NIC matches logging into the wrong account

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
