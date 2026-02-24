-- Update RLS policy to allow anonymous complaint submissions
DROP POLICY IF EXISTS "Staff can create feedback" ON public.feedback_complaints;

-- Create new policy that allows both authenticated staff and anonymous users to insert
CREATE POLICY "Allow complaint submissions" 
ON public.feedback_complaints 
FOR INSERT 
WITH CHECK (
  -- Allow staff members to create complaints (existing functionality)
  (auth.role() = 'authenticated' AND 
   (has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)))
  OR
  -- Allow anonymous submissions (new functionality)
  auth.role() = 'anon'
);