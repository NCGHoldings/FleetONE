-- Allow anonymous users to read student data for public receipt upload form
-- This is needed so parents can search for their children by admission number
CREATE POLICY "Anonymous users can search students by admission number"
ON public.school_students
FOR SELECT
TO anon
USING (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Anonymous users can search students by admission number" ON public.school_students 
IS 'Allows public receipt upload form to search for students by admission number. Parents need this to submit payment receipts.';