-- Fix Missing Status Column on Bank Accounts
-- This resolves the "column bank_accounts.status does not exist" API error
-- that is causing the React Query hook to fail and the Banking View to show 0 accounts.

-- Add the missing status column
ALTER TABLE bank_accounts 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add a comment for context
COMMENT ON COLUMN bank_accounts.status IS 'Added to resolve UI query dependencies. Defaults to active.';
