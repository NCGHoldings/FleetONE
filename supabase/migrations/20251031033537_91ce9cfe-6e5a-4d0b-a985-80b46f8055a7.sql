-- Fix function search path for security
DROP TRIGGER IF EXISTS update_pending_invites_updated_at ON public.pending_invites;
DROP FUNCTION IF EXISTS update_pending_invites_updated_at();

CREATE OR REPLACE FUNCTION update_pending_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

CREATE TRIGGER update_pending_invites_updated_at
  BEFORE UPDATE ON public.pending_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_invites_updated_at();