-- 1. Drop old permissive SELECT policies on buses and route_permits (NIC exposure)
DROP POLICY IF EXISTS "All authenticated users can view buses" ON public.buses;
DROP POLICY IF EXISTS "All authenticated users can view permits" ON public.route_permits;
DROP POLICY IF EXISTS "Authenticated users can view buses" ON public.buses;
DROP POLICY IF EXISTS "Authenticated users can view permits" ON public.route_permits;

-- 2. Drop old JWT-based policies on pending_invites
DROP POLICY IF EXISTS "Anon admins can delete invites" ON public.pending_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.pending_invites;

-- 3. Drop old permissive policies on lightvehicle_customers
DROP POLICY IF EXISTS "Auth select lv_customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Auth insert lv_customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Auth update lv_customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Authenticated users can view lv customers" ON public.lightvehicle_customers;
DROP POLICY IF EXISTS "Authenticated users can manage lv customers" ON public.lightvehicle_customers;

-- 4. Drop old permissive policies on sinotruck_customers
DROP POLICY IF EXISTS "Auth select sinotruck_customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Auth insert sinotruck_customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Auth update sinotruck_customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Authenticated users can view sinotruck customers" ON public.sinotruck_customers;
DROP POLICY IF EXISTS "Authenticated users can manage sinotruck customers" ON public.sinotruck_customers;