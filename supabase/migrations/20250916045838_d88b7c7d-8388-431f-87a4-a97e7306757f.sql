-- Fix RLS policy for special hire submissions to ensure anonymous users can submit
-- Drop existing INSERT policy and recreate with explicit anonymous permission

DROP POLICY IF EXISTS "Allow public and authenticated submissions" ON public.special_hire_submissions;

-- Create explicit policy for anonymous users to insert submissions
CREATE POLICY "Enable public submissions" 
ON public.special_hire_submissions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Ensure SELECT policy allows public viewing of their own submissions
DROP POLICY IF EXISTS "Staff can view submissions" ON public.special_hire_submissions;

CREATE POLICY "Allow viewing submissions" 
ON public.special_hire_submissions 
FOR SELECT 
TO anon, authenticated
USING (true);