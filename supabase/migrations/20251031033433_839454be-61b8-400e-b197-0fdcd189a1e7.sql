-- Create pending_invites table for secure staff invitation system
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  initial_role TEXT NOT NULL DEFAULT 'staff',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invite_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage invites
CREATE POLICY "Super admins can manage invites"
  ON public.pending_invites
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Public can view their own invite by token (for accept-invite page)
CREATE POLICY "Public can view invite by token"
  ON public.pending_invites
  FOR SELECT
  USING (true);

-- Create index on email and token for faster lookups
CREATE INDEX idx_pending_invites_email ON public.pending_invites(email);
CREATE INDEX idx_pending_invites_token ON public.pending_invites(invite_token);
CREATE INDEX idx_pending_invites_status ON public.pending_invites(status);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_pending_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_invites_updated_at
  BEFORE UPDATE ON public.pending_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_invites_updated_at();