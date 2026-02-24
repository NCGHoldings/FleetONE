-- Fix RLS policies for public submissions
DROP POLICY IF EXISTS "Allow anonymous submissions" ON public.special_hire_submissions;

-- Create proper policy for anonymous submissions
CREATE POLICY "Allow anonymous submissions" 
ON public.special_hire_submissions 
FOR INSERT 
TO anon, public
WITH CHECK (true);

-- Also allow authenticated users to insert (for staff creating submissions)
CREATE POLICY "Allow authenticated submissions" 
ON public.special_hire_submissions 
FOR INSERT 
TO authenticated
WITH CHECK (true);