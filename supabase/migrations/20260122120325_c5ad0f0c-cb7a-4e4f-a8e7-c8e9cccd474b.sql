-- Add branch_gl_account_id column to school_bus_finance_settings for direct COA mapping
-- This allows mapping each branch to a specific Cash/Bank GL account from chart_of_accounts

ALTER TABLE school_bus_finance_settings 
ADD COLUMN IF NOT EXISTS branch_gl_account_id UUID REFERENCES chart_of_accounts(id);

-- Add comment explaining the column purpose
COMMENT ON COLUMN school_bus_finance_settings.branch_gl_account_id IS 'Links branch to specific Cash/Bank GL account from chart_of_accounts for payment posting';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_school_bus_finance_branch_gl 
ON school_bus_finance_settings(branch_id, branch_gl_account_id);