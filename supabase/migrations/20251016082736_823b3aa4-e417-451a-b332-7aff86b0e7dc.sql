-- Enable RLS on user_page_permissions table
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_page_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions"
ON public.user_page_permissions FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can modify permissions (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage permissions"
ON public.user_page_permissions FOR ALL
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  public.has_role(auth.uid(), 'admin'::app_role)
);