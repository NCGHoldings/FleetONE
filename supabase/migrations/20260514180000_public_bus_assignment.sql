-- Migration to allow anonymous public fetching of today's bus assignments

CREATE OR REPLACE FUNCTION public.get_public_bus_assignment(p_bus_number TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    route_name TEXT,
    driver_name TEXT,
    conductor_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bus_id UUID;
    v_default_route TEXT;
BEGIN
    -- Get bus ID and default route
    SELECT id, route INTO v_bus_id, v_default_route
    FROM public.buses
    WHERE bus_no = p_bus_number;

    IF v_bus_id IS NULL THEN
        RETURN;
    END IF;

    -- Try to find today's assignment
    RETURN QUERY
    SELECT 
        r.route_name,
        COALESCE(d.first_name || ' ' || d.last_name, d.first_name, '') AS driver_name,
        COALESCE(c.first_name || ' ' || c.last_name, c.first_name, '') AS conductor_name
    FROM public.daily_trips dt
    LEFT JOIN public.routes r ON r.id = dt.route_id
    LEFT JOIN public.profiles d ON d.id = dt.driver_id
    LEFT JOIN public.profiles c ON c.id = dt.conductor_id
    WHERE dt.bus_id = v_bus_id AND dt.trip_date = p_date
    ORDER BY dt.created_at DESC
    LIMIT 1;

    -- If no records were returned by the above query, return the default route
    IF NOT FOUND THEN
        RETURN QUERY SELECT v_default_route AS route_name, ''::TEXT AS driver_name, ''::TEXT AS conductor_name;
    END IF;
END;
$$;

-- Grant access to anon role (for the public portal)
GRANT EXECUTE ON FUNCTION public.get_public_bus_assignment(TEXT, DATE) TO anon;
