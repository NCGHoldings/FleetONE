-- Migration: Update login_crew_member to handle NULL is_active and use ILIKE for NIC

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
    WHERE sr.nic_number ILIKE '%' || REPLACE(p_nic_number, ' ', '') || '%'
       OR REPLACE(sr.nic_number, ' ', '') ILIKE '%' || p_nic_number || '%'
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_crew_member(TEXT) TO anon;
