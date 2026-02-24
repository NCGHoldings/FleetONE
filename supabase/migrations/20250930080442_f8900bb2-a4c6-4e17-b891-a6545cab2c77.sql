-- Allow anonymous users to read branch data for public receipt upload form
-- This is needed for the join when searching for students
CREATE POLICY "Anonymous users can view branches"
ON public.school_branches
FOR SELECT
TO anon
USING (is_active = true);

-- Add comment explaining the policy
COMMENT ON POLICY "Anonymous users can view branches" ON public.school_branches 
IS 'Allows public receipt upload form to display branch information when searching for students.';