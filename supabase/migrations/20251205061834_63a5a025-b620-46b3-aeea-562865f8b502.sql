-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "All authenticated users can view bus loans" ON public.bus_loans;

-- Create a proper role-restricted SELECT policy for finance roles
CREATE POLICY "Finance can view bus loans" 
ON public.bus_loans 
FOR SELECT 
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'finance'::app_role])
);