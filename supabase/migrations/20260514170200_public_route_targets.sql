-- Migration to create an RPC function for the public conductor upload portal
-- This allows anonymous users to securely fetch active routes and their financial targets

CREATE OR REPLACE FUNCTION public.get_public_route_targets()
RETURNS TABLE (
    route_name TEXT,
    revenue_target NUMERIC,
    driver_commission_percent NUMERIC,
    conductor_commission_percent NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        r.route_name,
        COALESCE(rt.revenue_target, 0) as revenue_target,
        COALESCE(rt.driver_commission_percent, 0) as driver_commission_percent,
        COALESCE(rt.conductor_commission_percent, 0) as conductor_commission_percent
    FROM public.routes r
    LEFT JOIN public.route_targets rt ON r.id = rt.route_id AND rt.is_active = true
    WHERE r.is_active = true
    ORDER BY r.route_name ASC;
$$;

-- Grant execute permission to the public/anonymous role
GRANT EXECUTE ON FUNCTION public.get_public_route_targets() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_route_targets() TO authenticated;
