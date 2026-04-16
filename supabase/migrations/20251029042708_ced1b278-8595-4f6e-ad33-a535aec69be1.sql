-- Drop existing restrictive policy that only allows anonymous users
DROP POLICY IF EXISTS "Public can create submissions" ON special_hire_submissions;

-- Create new policy allowing both anonymous (anon) and authenticated users (public = anon + authenticated)
CREATE POLICY "Public can create submissions"
ON special_hire_submissions
FOR INSERT
TO public  -- This includes both 'anon' and 'authenticated' roles
WITH CHECK (true);