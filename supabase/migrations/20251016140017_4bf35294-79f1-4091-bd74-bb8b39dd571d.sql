-- CRITICAL SECURITY FIX: Protect special_hire_submissions from public data exposure
-- This table contains PII (names, phone numbers, emails, addresses, travel schedules)

-- Phase 1: Drop ALL existing policies (including ones not mentioned in error)
DROP POLICY IF EXISTS "Allow viewing submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Enable public submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Staff can view all submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Staff can update submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.special_hire_submissions;
DROP POLICY IF EXISTS "Public can create submissions" ON public.special_hire_submissions;

-- Ensure RLS is enabled
ALTER TABLE public.special_hire_submissions ENABLE ROW LEVEL SECURITY;

-- Phase 2: Create secure INSERT-only policy for anonymous users
CREATE POLICY "Public can create submissions"
ON public.special_hire_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Phase 3: Create role-based staff access policies
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

COMMENT ON TABLE public.special_hire_submissions IS 'Contains customer PII. RLS restricts SELECT to authenticated staff only. Public users can INSERT but not read data.';