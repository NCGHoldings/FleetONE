-- Allow unauthenticated users to view active bus types for public special hire form
CREATE POLICY "Public can view active bus types" 
ON public.bus_types 
FOR SELECT 
TO anon 
USING (is_active = true);