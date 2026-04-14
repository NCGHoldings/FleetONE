-- Fix unique constraint: account_code should be unique PER COMPANY, not globally
-- This allows each company to have their own Chart of Accounts with the same codes

-- Drop the existing global unique constraint on account_code
ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_account_code_key;

-- Create new composite unique constraint (account_code + company_id)
ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chart_of_accounts_company_account_code_key 
UNIQUE (company_id, account_code);

-- Now copy COA to all other companies

-- Copy to Yutong Sales
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, current_balance
)
SELECT 
  'efc37802-e6bf-4426-ab69-fcac84c953b1',
  account_code, account_name, account_type,
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, 0
FROM chart_of_accounts
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Copy to Special Hire
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, current_balance
)
SELECT 
  'bfd054c7-2403-4972-9a8a-2599a777a801',
  account_code, account_name, account_type,
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, 0
FROM chart_of_accounts
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Copy to Light Vehicle Sales
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, current_balance
)
SELECT 
  'ac957087-0224-4149-b231-7aa9e6a3aea1',
  account_code, account_name, account_type,
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, 0
FROM chart_of_accounts
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Copy to Sinotruck Sales
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, current_balance
)
SELECT 
  'fe7439e7-3dde-47fd-8052-10b9eaf7abe8',
  account_code, account_name, account_type,
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, 0
FROM chart_of_accounts
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Copy to NCG Holding
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, current_balance
)
SELECT 
  'f40b0a9d-ae5b-41b3-9188-535ae94c9020',
  account_code, account_name, account_type,
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, 0
FROM chart_of_accounts
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Copy to NCG Express
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type, 
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, current_balance
)
SELECT 
  '7ece7595-8b7b-46de-8bfc-c1e8e0da7513',
  account_code, account_name, account_type,
  level1, level2, level3, level4, level5, gl_code,
  account_level, is_header, is_active, 0
FROM chart_of_accounts
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';