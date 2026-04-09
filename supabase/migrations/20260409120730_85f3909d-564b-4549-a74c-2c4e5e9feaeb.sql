
-- Branch access table
CREATE TABLE IF NOT EXISTS public.user_school_branch_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

ALTER TABLE public.user_school_branch_access ENABLE ROW LEVEL SECURITY;

-- Only admins can manage branch access
CREATE POLICY "Admins manage branch access"
  ON public.user_school_branch_access FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Users can see their own access
CREATE POLICY "Users see own branch access"
  ON public.user_school_branch_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Security definer function for branch access check
CREATE OR REPLACE FUNCTION public.can_access_school_branch(_branch_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- admins/super_admins/finance can access all
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'finance')
    )
    OR
    -- explicitly assigned users
    EXISTS (
      SELECT 1 FROM public.user_school_branch_access
      WHERE user_id = auth.uid()
        AND branch_id = _branch_id
    )
$$;

-- Tighten RLS on school_payment_imports
DROP POLICY IF EXISTS "Authenticated users can manage school_payment_imports" ON public.school_payment_imports;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.school_payment_imports;

CREATE POLICY "Branch-scoped access to school_payment_imports"
  ON public.school_payment_imports FOR ALL
  TO authenticated
  USING (public.can_access_school_branch(branch_id))
  WITH CHECK (public.can_access_school_branch(branch_id));

-- Tighten RLS on school_payment_import_items
DROP POLICY IF EXISTS "Authenticated users can manage school_payment_import_items" ON public.school_payment_import_items;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.school_payment_import_items;

CREATE POLICY "Branch-scoped access to school_payment_import_items"
  ON public.school_payment_import_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.school_payment_imports spi
      WHERE spi.id = import_id
        AND public.can_access_school_branch(spi.branch_id)
    )
  );

-- Tighten RLS on school_payment_import_settings
DROP POLICY IF EXISTS "Authenticated users can manage school_payment_import_settings" ON public.school_payment_import_settings;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.school_payment_import_settings;

CREATE POLICY "Branch-scoped access to school_payment_import_settings"
  ON public.school_payment_import_settings FOR ALL
  TO authenticated
  USING (public.can_access_school_branch(branch_id))
  WITH CHECK (public.can_access_school_branch(branch_id));

-- Tighten RLS on school_payment_pattern_history
DROP POLICY IF EXISTS "Authenticated users can manage school_payment_pattern_history" ON public.school_payment_pattern_history;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON public.school_payment_pattern_history;

CREATE POLICY "Branch-scoped access to school_payment_pattern_history"
  ON public.school_payment_pattern_history FOR ALL
  TO authenticated
  USING (public.can_access_school_branch(branch_id))
  WITH CHECK (public.can_access_school_branch(branch_id));
