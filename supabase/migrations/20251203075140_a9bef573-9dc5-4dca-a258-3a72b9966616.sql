-- Create temporary_accounts table for auto-generated login credentials with validity periods
CREATE TABLE public.temporary_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  generated_email TEXT NOT NULL UNIQUE,
  plain_password_display TEXT, -- Shown only once when created, then cleared
  validity_hours INTEGER NOT NULL DEFAULT 24,
  valid_until TIMESTAMPTZ NOT NULL,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  notes TEXT,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_temporary_accounts_status ON public.temporary_accounts(status);
CREATE INDEX idx_temporary_accounts_valid_until ON public.temporary_accounts(valid_until);
CREATE INDEX idx_temporary_accounts_auth_user_id ON public.temporary_accounts(auth_user_id);

-- Enable RLS
ALTER TABLE public.temporary_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Super admins can manage temporary accounts"
ON public.temporary_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

CREATE POLICY "Admins can view temporary accounts"
ON public.temporary_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- Function to auto-update updated_at
CREATE TRIGGER update_temporary_accounts_updated_at
BEFORE UPDATE ON public.temporary_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique account code
CREATE OR REPLACE FUNCTION generate_temp_account_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'TEMP-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.temporary_accounts WHERE account_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to expire accounts (can be called by pg_cron)
CREATE OR REPLACE FUNCTION expire_temporary_accounts()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.temporary_accounts
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND valid_until < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;