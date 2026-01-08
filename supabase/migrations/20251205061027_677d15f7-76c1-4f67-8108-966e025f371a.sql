-- Drop the overly permissive SELECT policy that allows all authenticated users
DROP POLICY IF EXISTS "All authenticated users can view students" ON public.school_students;