-- Drop the overly permissive policy that allows public read
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Create restricted policy: only authenticated users can view roles
CREATE POLICY "Authenticated users can view roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (true);