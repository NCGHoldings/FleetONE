-- Migration: Make get_public_bus_assignment robust to spaces and dashes in bus numbers

CREATE OR REPLACE FUNCTION public.get_public_bus_assignment(p_bus_number TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    route_name TEXT,
    driver_name TEXT,
    conductor_name TEXT,
    total_allocated_trips BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bus_id UUID;
    v_default_route TEXT;
    v_trip_count BIGINT;
    v_normalized_bus TEXT;
BEGIN
    -- Normalize the input bus number (remove spaces and dashes, convert to upper)
    v_normalized_bus := UPPER(REPLACE(REPLACE(p_bus_number, ' ', ''), '-', ''));

    -- Get bus ID and default route
    SELECT id, route INTO v_bus_id, v_default_route
    FROM public.buses
    WHERE UPPER(REPLACE(REPLACE(bus_no, ' ', ''), '-', '')) = v_normalized_bus
    LIMIT 1;

    IF v_bus_id IS NULL THEN
        -- If bus not found, return empty info so it doesn't break
        RETURN QUERY SELECT ''::TEXT AS route_name, ''::TEXT AS driver_name, ''::TEXT AS conductor_name, 0::BIGINT AS total_allocated_trips;
        RETURN;
    END IF;

    -- Count total allocated trips for this bus today
    SELECT COUNT(*) INTO v_trip_count
    FROM public.daily_trips
    WHERE bus_id = v_bus_id AND trip_date = p_date;

    -- Try to find today's assignment details
    RETURN QUERY
    SELECT 
        COALESCE(r.route_name, v_default_route, ''),
        COALESCE(d.first_name || ' ' || d.last_name, d.first_name, '') AS driver_name,
        COALESCE(c.first_name || ' ' || c.last_name, c.first_name, '') AS conductor_name,
        v_trip_count AS total_allocated_trips
    FROM public.daily_trips dt
    LEFT JOIN public.routes r ON r.id = dt.route_id
    LEFT JOIN public.profiles d ON d.id = dt.driver_id
    LEFT JOIN public.profiles c ON c.id = dt.conductor_id
    WHERE dt.bus_id = v_bus_id AND dt.trip_date = p_date
    ORDER BY dt.created_at DESC
    LIMIT 1;

    -- If no records were returned by the above query, return the default route and 0 trips
    IF NOT FOUND THEN
        RETURN QUERY SELECT COALESCE(v_default_route, '') AS route_name, ''::TEXT AS driver_name, ''::TEXT AS conductor_name, 0::BIGINT AS total_allocated_trips;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_bus_assignment(TEXT, DATE) TO anon;
