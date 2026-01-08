-- CRITICAL SECURITY FIX: Protect special_hire_submissions from public data exposure
-- This table contains PII (names, phone numbers, emails, addresses, travel schedules)

-- Drop ALL existing policies to ensure clean slate
DROP POLICY IF EXISTS "Allow viewing submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Enable public submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Public can create submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Staff can view all submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Staff can update submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.special_hire_submissions;

-- Ensure RLS is enabled
ALTER TABLE public.special_hire_submissions ENABLE ROW LEVEL SECURITY;

-- Create secure INSERT-only policy for public (anonymous) users
-- Public users can submit requests but CANNOT read any data
CREATE POLICY "Public can create submissions"
ON public.special_hire_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Create authenticated staff policies with role-based access control
CREATE POLICY "Staff can view all submissions"
ON public.special_hire_submissions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Staff can update submissions"
ON public.special_hire_submissions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
);

CREATE POLICY "Admins can delete submissions"
ON public.special_hire_submissions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Document the security fix
COMMENT ON TABLE public.special_hire_submissions IS 'Contains customer PII. RLS policies restrict SELECT to authenticated staff only. Public can INSERT but not read data.';