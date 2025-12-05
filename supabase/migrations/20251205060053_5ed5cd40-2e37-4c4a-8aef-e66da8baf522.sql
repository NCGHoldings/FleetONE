-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "All authenticated users can view daily trips" ON public.daily_trips;

-- Create new policy: Admins/supervisors can view all trips
CREATE POLICY "Admins can view all trips" 
ON public.daily_trips 
FOR SELECT 
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'supervisor'::app_role, 'finance'::app_role])
);

-- Create new policy: Drivers/conductors can only view their own trips
CREATE POLICY "Staff can view own trips" 
ON public.daily_trips 
FOR SELECT 
TO authenticated
USING (
  driver_id = auth.uid() OR conductor_id = auth.uid()
);