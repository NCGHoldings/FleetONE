
-- Drop existing overly-permissive policies on school_students
DROP POLICY IF EXISTS "Authenticated users can manage school_students" ON public.school_students;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.school_students;
DROP POLICY IF EXISTS "Users can view school students" ON public.school_students;
DROP POLICY IF EXISTS "Users can manage school students" ON public.school_students;

-- Create branch-scoped RLS policies using the existing can_access_school_branch function
CREATE POLICY "Branch-scoped read access to school_students"
  ON public.school_students FOR SELECT
  TO authenticated
  USING (public.can_access_school_branch(branch_id));

CREATE POLICY "Branch-scoped insert access to school_students"
  ON public.school_students FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_school_branch(branch_id));

CREATE POLICY "Branch-scoped update access to school_students"
  ON public.school_students FOR UPDATE
  TO authenticated
  USING (public.can_access_school_branch(branch_id))
  WITH CHECK (public.can_access_school_branch(branch_id));

CREATE POLICY "Branch-scoped delete access to school_students"
  ON public.school_students FOR DELETE
  TO authenticated
  USING (public.can_access_school_branch(branch_id));
