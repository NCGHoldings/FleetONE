-- Migration: Add login_crew_member RPC for secure anonymous login

CREATE OR REPLACE FUNCTION public.login_crew_member(p_nic_number TEXT)
RETURNS TABLE (
    id UUID,
    staff_name TEXT,
    staff_type public.staff_type,
    nic_number TEXT,
    contact_number TEXT,
    pin_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT sr.id, sr.staff_name, sr.staff_type, sr.nic_number, sr.contact_number, sr.pin_code
    FROM public.staff_registry sr
    WHERE sr.nic_number = p_nic_number
      AND sr.is_active = true
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_crew_member(TEXT) TO anon;
