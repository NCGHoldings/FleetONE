-- Cleanup Script for Bank Accounts (Fixed Foreign Key Issues)
-- 1. Identifies and removes Test Company bank accounts that were accidentally moved to NCG Holding.
-- 2. Removes any bank accounts that are NOT properly linked to the 'Cash at Bank' COA group.
-- Note: Does NOT modify the Chart of Accounts.

DO $$ 
DECLARE
    holding_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN

    -- ==========================================
    -- PART A: Cleanup Test Accounts
    -- ==========================================
    -- Delete child records first to avoid Foreign Key constraint errors!
    
    -- 1. Delete transactions for test bank accounts
    DELETE FROM bank_transactions bt
    USING bank_accounts ba, chart_of_accounts coa, companies c
    WHERE bt.bank_account_id = ba.id
      AND ba.gl_account_id = coa.id
      AND coa.company_id = c.id
      AND c.business_unit_type = 'test';

    -- 2. Delete reconciliations for test bank accounts
    DELETE FROM bank_reconciliations br
    USING bank_accounts ba, chart_of_accounts coa, companies c
    WHERE br.bank_account_id = ba.id
      AND ba.gl_account_id = coa.id
      AND coa.company_id = c.id
      AND c.business_unit_type = 'test';

    -- 3. Delete the actual test bank accounts
    DELETE FROM bank_accounts ba
    USING chart_of_accounts coa, companies c
    WHERE ba.gl_account_id = coa.id
      AND coa.company_id = c.id
      AND c.business_unit_type = 'test'
      AND ba.company_id = holding_id;


    -- ==========================================
    -- PART B: Cleanup Non-COA / Invalid Bank Accounts
    -- ==========================================
    
    -- 1. Delete transactions for invalid bank accounts under NCG Holding
    DELETE FROM bank_transactions bt
    USING bank_accounts ba
    WHERE bt.bank_account_id = ba.id
      AND ba.company_id = holding_id
      AND (
          ba.gl_account_id IS NULL OR 
          ba.gl_account_id NOT IN (
              SELECT id FROM chart_of_accounts 
              WHERE company_id = holding_id 
                AND (
                    account_type = 'asset' 
                    OR parent_id IN (SELECT id FROM chart_of_accounts WHERE account_name ILIKE '%cash at bank%')
                )
          )
      );

    -- 2. Delete reconciliations for invalid bank accounts
    DELETE FROM bank_reconciliations br
    USING bank_accounts ba
    WHERE br.bank_account_id = ba.id
      AND ba.company_id = holding_id
      AND (
          ba.gl_account_id IS NULL OR 
          ba.gl_account_id NOT IN (
              SELECT id FROM chart_of_accounts 
              WHERE company_id = holding_id 
                AND (
                    account_type = 'asset' 
                    OR parent_id IN (SELECT id FROM chart_of_accounts WHERE account_name ILIKE '%cash at bank%')
                )
          )
      );

    -- 3. Delete the actual invalid bank accounts
    DELETE FROM bank_accounts ba
    WHERE ba.company_id = holding_id
      AND (
          ba.gl_account_id IS NULL OR 
          ba.gl_account_id NOT IN (
              SELECT id FROM chart_of_accounts 
              WHERE company_id = holding_id 
                AND (
                    account_type = 'asset' 
                    OR parent_id IN (SELECT id FROM chart_of_accounts WHERE account_name ILIKE '%cash at bank%')
                )
          )
      );

    NOTIFY pgrst, 'reload schema';
END $$;
