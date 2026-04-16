-- CRITICAL SECURITY FIX: Protect employee PII in profiles table from public exposure
-- This table contains sensitive employee data: names, phone numbers, addresses, NIC numbers,
-- license details, emergency contacts, dates of birth, and digital signatures

-- Drop the overly permissive public policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure policy: Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create secure policy: Admins and super admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Existing UPDATE policy remains secure (users can update own profile)
-- Existing INSERT policy remains secure (handled by auth trigger)

-- Document the security fix
COMMENT ON TABLE public.profiles IS 'Contains employee PII. RLS policies restrict SELECT to own profile or admin access only. Public access completely removed.';