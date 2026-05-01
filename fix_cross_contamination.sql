-- 1. Find and report cross-contaminated bank accounts
SELECT ba.id, ba.account_name, ba.company_id AS ba_company, coa.id AS coa_id, coa.company_id AS coa_company, coa.account_code
FROM bank_accounts ba
JOIN chart_of_accounts coa ON ba.gl_account_id = coa.id
WHERE ba.company_id != coa.company_id;

-- 2. Nullify any cross-contaminated GL links to sever the tie immediately
UPDATE bank_accounts ba
SET gl_account_id = NULL
FROM chart_of_accounts coa
WHERE ba.gl_account_id = coa.id
  AND ba.company_id != coa.company_id;
