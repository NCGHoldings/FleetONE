-- Create user page permissions table
CREATE TABLE public.user_page_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_identifier TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_identifier)
);

-- Enable RLS
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage all page permissions" 
ON public.user_page_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own page permissions" 
ON public.user_page_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to get user page permissions
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(_user_id uuid)
RETURNS TABLE(page_identifier text, has_access boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    page_identifier,
    has_access
  FROM public.user_page_permissions 
  WHERE user_id = _user_id
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_user_page_permissions_updated_at
BEFORE UPDATE ON public.user_page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();