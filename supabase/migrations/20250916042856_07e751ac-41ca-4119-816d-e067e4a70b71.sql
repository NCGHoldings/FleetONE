-- Fix RLS policy for public special hire submissions
-- Drop existing policy and recreate with proper permissions for anonymous users

DROP POLICY IF EXISTS "Allow public and authenticated submissions" ON public.special_hire_submissions;

-- Create new policy that explicitly allows anonymous users to insert
CREATE POLICY "Allow public and authenticated submissions" 
ON public.special_hire_submissions 
FOR INSERT 
TO public
WITH CHECK (true);