-- =====================================================================
-- Migration: Fix bank_accounts unique constraint 
-- Problem: UNIQUE(account_code) is global, preventing updates when
--          the same account_code exists across different companies.
--          This was already fixed for chart_of_accounts but bank_accounts
--          was missed.
-- Fix: Replace UNIQUE(account_code) with UNIQUE(company_id, account_code)
-- =====================================================================

-- Step 1: Drop the old global unique constraint
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_account_code_key;

-- Step 2: Add a company-scoped unique constraint
ALTER TABLE bank_accounts 
ADD CONSTRAINT bank_accounts_company_account_code_key 
UNIQUE (company_id, account_code);

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
