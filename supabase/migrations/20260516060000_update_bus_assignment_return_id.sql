-- Fix: Update get_public_bus_assignment to return daily_trip_id for linking submissions
-- This allows the driver/conductor app to automatically capture the scheduled trip ID.

DROP FUNCTION IF EXISTS public.get_public_bus_assignment(TEXT, DATE);

CREATE OR REPLACE FUNCTION public.get_public_bus_assignment(p_bus_number TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    route_name TEXT,
    driver_name TEXT,
    conductor_name TEXT,
    total_allocated_trips BIGINT,
    daily_trip_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bus_id UUID;
    v_default_route TEXT;
    v_roster_route TEXT;
    v_roster_trips INTEGER;
    v_trip_count BIGINT;
    v_normalized_bus TEXT;
    v_found BOOLEAN := false;
BEGIN
    -- Normalize the input bus number (remove spaces and dashes, convert to upper)
    v_normalized_bus := UPPER(REPLACE(REPLACE(p_bus_number, ' ', ''), '-', ''));

    -- Get bus ID and default route from buses table
    SELECT id, route INTO v_bus_id, v_default_route
    FROM public.buses
    WHERE UPPER(REPLACE(REPLACE(bus_no, ' ', ''), '-', '')) = v_normalized_bus
    LIMIT 1;

    IF v_bus_id IS NULL THEN
        -- Bus not found at all
        RETURN QUERY SELECT ''::TEXT, ''::TEXT, ''::TEXT, 0::BIGINT, NULL::UUID;
        RETURN;
    END IF;

    -- Check fleet_master_roster for the authoritative route assignment
    SELECT fmr.route_label, fmr.trips_per_day
    INTO v_roster_route, v_roster_trips
    FROM public.fleet_master_roster fmr
    WHERE fmr.bus_id = v_bus_id AND fmr.is_active = true
    LIMIT 1;

    -- Count total allocated trips for this bus today from daily_trips
    SELECT COUNT(*) INTO v_trip_count
    FROM public.daily_trips
    WHERE bus_id = v_bus_id AND trip_date = p_date;

    -- Try to find today's assignment details from daily_trips first
    RETURN QUERY
    SELECT 
        COALESCE(r.route_name, v_roster_route, v_default_route, ''),
        COALESCE(d.first_name || ' ' || d.last_name, d.first_name, '') AS driver_name,
        COALESCE(c.first_name || ' ' || c.last_name, c.first_name, '') AS conductor_name,
        GREATEST(v_trip_count, COALESCE(v_roster_trips, 0)::BIGINT) AS total_allocated_trips,
        dt.id AS daily_trip_id
    FROM public.daily_trips dt
    LEFT JOIN public.routes r ON r.id = dt.route_id
    LEFT JOIN public.profiles d ON d.id = dt.driver_id
    LEFT JOIN public.profiles c ON c.id = dt.conductor_id
    WHERE dt.bus_id = v_bus_id AND dt.trip_date = p_date
    ORDER BY dt.created_at DESC
    LIMIT 1;

    -- If no daily_trips records, return from fleet_master_roster or buses.route
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            COALESCE(v_roster_route, v_default_route, '') AS route_name, 
            ''::TEXT AS driver_name, 
            ''::TEXT AS conductor_name, 
            COALESCE(v_roster_trips, 0)::BIGINT AS total_allocated_trips,
            NULL::UUID AS daily_trip_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_bus_assignment(TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_bus_assignment(TEXT, DATE) TO authenticated;
