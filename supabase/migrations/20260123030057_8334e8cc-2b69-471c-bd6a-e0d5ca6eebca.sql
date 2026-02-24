
-- Part 1: Update school_bus_finance_settings to use NCG Holding accounts
UPDATE school_bus_finance_settings
SET 
  cash_account_id = 'e61e3e82-1c63-404e-87bf-c6327083bd68'::uuid,
  trade_receivable_account_id = 'ad95331f-95d9-46ee-ab9d-91f623c6d288'::uuid,
  sbs_collection_account_id = '92db35be-b53e-40d8-9953-c7fc4f7d7ae1'::uuid,
  branch_gl_account_id = CASE 
    WHEN branch_gl_account_id IS NOT NULL THEN 'e61e3e82-1c63-404e-87bf-c6327083bd68'::uuid
    ELSE NULL
  END,
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'::uuid
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Delete NCG Express settings (it should not have School Bus settings)
DELETE FROM school_bus_finance_settings
WHERE company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

-- Part 2: Delete AR invoice batches that reference incorrect journal entries
DELETE FROM school_ar_invoice_batches 
WHERE journal_entry_id = '19f7fc2d-a6e0-467a-881d-cccf498a109c';

-- Part 3: Delete journal entry lines for contaminated NCG Express entry
DELETE FROM journal_entry_lines 
WHERE journal_entry_id = '19f7fc2d-a6e0-467a-881d-cccf498a109c';

-- Part 4: Delete the contaminated journal entry
DELETE FROM journal_entries 
WHERE id = '19f7fc2d-a6e0-467a-881d-cccf498a109c';

-- Part 5: Reset NCG Express COA balances to 0
UPDATE chart_of_accounts
SET current_balance = 0
WHERE company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

-- Part 6: Migrate journal entry lines from sub-company accounts to NCG Holding
UPDATE journal_entry_lines jel
SET account_id = (
  SELECT ncg_coa.id 
  FROM chart_of_accounts ncg_coa
  WHERE ncg_coa.company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
    AND ncg_coa.account_code = (
      SELECT account_code FROM chart_of_accounts WHERE id = jel.account_id
    )
  LIMIT 1
)
WHERE account_id IN (
  SELECT id FROM chart_of_accounts 
  WHERE company_id IN (
    'ac957087-0224-4149-b231-7aa9e6a3aea1',
    '0fba4a2f-598b-47e8-b863-283d00380b06',
    'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
    'bfd054c7-2403-4972-9a8a-2599a777a801',
    'efc37802-e6bf-4426-ab69-fcac84c953b1'
  )
);

-- Part 7: Delete sub-company COAs
DELETE FROM chart_of_accounts
WHERE company_id IN (
  'ac957087-0224-4149-b231-7aa9e6a3aea1',
  '0fba4a2f-598b-47e8-b863-283d00380b06',
  'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
  'bfd054c7-2403-4972-9a8a-2599a777a801',
  'efc37802-e6bf-4426-ab69-fcac84c953b1'
);

-- Part 8: Reset and recalculate NCG Holding balances
UPDATE chart_of_accounts SET current_balance = 0
WHERE company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE chart_of_accounts coa
SET current_balance = COALESCE((
  SELECT 
    CASE 
      WHEN coa.account_type IN ('asset', 'expense') 
        THEN SUM(COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0))
      ELSE 
        SUM(COALESCE(jel.credit, 0) - COALESCE(jel.debit, 0))
    END
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = coa.id
    AND je.status = 'posted'
), 0)
WHERE coa.company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';
