-- Step 1: Delete duplicate item categories under test sub-companies
-- C7_ categories already exist under NCG Test parent with correct COA mappings
DELETE FROM item_categories
WHERE company_id IN (
  '0fba4a2f-598b-47e8-b863-283d00380b06',
  'bfd054c7-2403-4972-9a8a-2599a777a801',
  'ac957087-0224-4149-b231-7aa9e6a3aea1',
  'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
  'efc37802-e6bf-4426-ab69-fcac84c953b1'
);

-- Step 2: Delete petty cash funds referencing stray COA
DELETE FROM petty_cash_funds
WHERE gl_account_id IN (
  SELECT id FROM chart_of_accounts WHERE company_id IN (
    '0fba4a2f-598b-47e8-b863-283d00380b06',
    'bfd054c7-2403-4972-9a8a-2599a777a801',
    'ac957087-0224-4149-b231-7aa9e6a3aea1',
    'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
    'efc37802-e6bf-4426-ab69-fcac84c953b1'
  )
);

-- Step 3: Delete gl_settings for test sub-companies
DELETE FROM gl_settings
WHERE company_id IN (
  '0fba4a2f-598b-47e8-b863-283d00380b06',
  'bfd054c7-2403-4972-9a8a-2599a777a801',
  'ac957087-0224-4149-b231-7aa9e6a3aea1',
  'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
  'efc37802-e6bf-4426-ab69-fcac84c953b1'
);

-- Step 4: Delete stray COA entries under test sub-companies
DELETE FROM chart_of_accounts
WHERE company_id IN (
  '0fba4a2f-598b-47e8-b863-283d00380b06',
  'bfd054c7-2403-4972-9a8a-2599a777a801',
  'ac957087-0224-4149-b231-7aa9e6a3aea1',
  'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
  'efc37802-e6bf-4426-ab69-fcac84c953b1'
);