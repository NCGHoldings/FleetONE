-- Fix pending_invites RLS vulnerability
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can view invite by token" ON pending_invites;
DROP POLICY IF EXISTS "Enable read access for all users" ON pending_invites;
DROP POLICY IF EXISTS "Allow public to read pending invites" ON pending_invites;

-- Only authenticated admins can view all invites directly
CREATE POLICY "Admins can view all invites"
ON pending_invites
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Only admins can manage invites
CREATE POLICY "Admins can insert invites"
ON pending_invites
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update invites"
ON pending_invites
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete invites"
ON pending_invites
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Create secure function to validate invite token (for unauthenticated users)
CREATE OR REPLACE FUNCTION validate_invite_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  -- Fetch invite by exact token match with minimal data exposure
  SELECT 
    id,
    email,
    first_name,
    last_name,
    initial_role,
    expires_at,
    status
  INTO v_invite
  FROM pending_invites
  WHERE invite_token = p_token
    AND status = 'pending'
    AND expires_at > now();
  
  -- Return null if not found or invalid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid or expired invitation token'
    );
  END IF;
  
  -- Return minimal invite data
  RETURN jsonb_build_object(
    'valid', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'email', v_invite.email,
      'first_name', v_invite.first_name,
      'last_name', v_invite.last_name,
      'initial_role', v_invite.initial_role,
      'expires_at', v_invite.expires_at
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error server-side but return generic message
  RAISE WARNING 'Error validating invite token: %', SQLERRM;
  RETURN jsonb_build_object(
    'valid', false,
    'message', 'Unable to validate invitation. Please contact support.'
  );
END;
$$;

-- Grant execute permission to anonymous users for the validation function
GRANT EXECUTE ON FUNCTION validate_invite_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION validate_invite_token(uuid) TO authenticated;