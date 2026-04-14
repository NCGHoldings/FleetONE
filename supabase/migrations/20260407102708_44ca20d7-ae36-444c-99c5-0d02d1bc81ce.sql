-- Drop existing INSERT policies on feedback_complaints
DROP POLICY IF EXISTS "Anyone can submit" ON public.feedback_complaints;
DROP POLICY IF EXISTS "Public and authenticated users can submit complaints" ON public.feedback_complaints;
DROP POLICY IF EXISTS "Authenticated users can create complaints" ON public.feedback_complaints;
DROP POLICY IF EXISTS "Staff can create complaints" ON public.feedback_complaints;

-- Create a single INSERT policy that covers both anon and authenticated users
CREATE POLICY "Public and staff can submit complaints"
ON public.feedback_complaints
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Anonymous public submissions: must have specific fields
  (
    auth.role() = 'anon'
    AND reported_by IS NULL
    AND type = 'complaint'
    AND status = 'new'
    AND escalation_level = 1
  )
  OR
  -- Authenticated staff can insert any complaint
  (auth.role() = 'authenticated')
);