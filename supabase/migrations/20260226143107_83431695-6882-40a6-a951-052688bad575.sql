
-- Fix profiles table RLS policies for sensitive data protection

-- 1. Drop all existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profile_select_self" ON public.profiles;

-- 2. Self-view: users can see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 3. Admin/Super Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role((SELECT auth.uid()), 'super_admin'::app_role) OR
  has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- 4. Supervisors need basic profile info for operational purposes
CREATE POLICY "Supervisors can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role((SELECT auth.uid()), 'supervisor'::app_role)
);

-- 5. Finance needs profile info for payroll linkage
CREATE POLICY "Finance can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role((SELECT auth.uid()), 'finance'::app_role)
);

-- 6. Fix UPDATE policy - currently uses auth.role() = 'admin' which checks JWT role not app role
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  has_role((SELECT auth.uid()), 'super_admin'::app_role) OR
  has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'super_admin'::app_role) OR
  has_role((SELECT auth.uid()), 'admin'::app_role)
);
