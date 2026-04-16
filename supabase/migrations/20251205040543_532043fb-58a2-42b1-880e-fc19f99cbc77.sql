-- Drop overly permissive policies on school_students
DROP POLICY IF EXISTS "All authenticated users can view school students" ON public.school_students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.school_students;
DROP POLICY IF EXISTS "Users can view school students" ON public.school_students;

-- Create restricted policy: only admins and supervisors can view student data
CREATE POLICY "School staff can view students" 
ON public.school_students 
FOR SELECT 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));