-- Fix Bank Transactions Sync
-- This script ensures that all bank transactions have the same company_id as their parent bank account.
-- Since we moved some bank accounts to NCG Holding, their historical transactions were left behind 
-- under the old sub-company IDs, making them invisible in the Holding view.

DO $$ 
BEGIN
    -- 1. Sync company_id on bank_transactions to match the parent bank_account
    UPDATE bank_transactions bt
    SET company_id = ba.company_id
    FROM bank_accounts ba
    WHERE bt.bank_account_id = ba.id
      AND bt.company_id != ba.company_id;

    -- 2. Sync company_id on bank_reconciliations to match the parent bank_account (just in case)
    UPDATE bank_reconciliations br
    SET company_id = ba.company_id
    FROM bank_accounts ba
    WHERE br.bank_account_id = ba.id
      AND br.company_id != ba.company_id;

    NOTIFY pgrst, 'reload schema';
END $$;
