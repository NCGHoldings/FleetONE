-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Allow authenticated submissions" ON public.special_hire_submissions;

-- Create comprehensive policy for all insertions (anonymous and authenticated)
CREATE POLICY "Allow public and authenticated submissions" 
ON public.special_hire_submissions 
FOR INSERT 
TO anon, authenticated, public
WITH CHECK (true);