-- Fix existing bank transactions to match their bank account's company_id
UPDATE bank_transactions bt
SET company_id = ba.company_id,
    updated_at = NOW()
FROM bank_accounts ba
WHERE bt.bank_account_id = ba.id
  AND bt.company_id != ba.company_id;

-- Also fix inter_bank_transfers to match their source bank account's company_id
UPDATE inter_bank_transfers ibt
SET company_id = ba.company_id,
    updated_at = NOW()
FROM bank_accounts ba
WHERE ibt.from_bank_account_id = ba.id
  AND ibt.company_id != ba.company_id;