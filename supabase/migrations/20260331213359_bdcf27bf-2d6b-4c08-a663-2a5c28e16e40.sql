
-- Step 1: Create test parent company
INSERT INTO companies (id, name, business_unit_type, parent_company_id)
VALUES ('a0000000-0000-0000-0000-000000000001', 'NCG Test Environment', 'test', NULL);

-- Step 2: Create test sub-companies
INSERT INTO companies (id, name, business_unit_type, parent_company_id) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Test School Bus', 'test', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'Test Yutong', 'test', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'Test Sinotruck', 'test', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', 'Test Special Hire', 'test', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', 'Test Light Vehicle', 'test', 'a0000000-0000-0000-0000-000000000001');

-- Step 3: Copy COA from NCG Holding to test parent (zero balances, no parent ref for now)
INSERT INTO chart_of_accounts (
  company_id, account_code, account_name, account_type,
  is_active, current_balance, description, level1, level2, level3, level4, level5,
  account_level, is_header, gl_code
)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  account_code, account_name, account_type,
  is_active, 0, description, level1, level2, level3, level4, level5,
  account_level, is_header, gl_code
FROM chart_of_accounts
WHERE company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

-- Step 4: Fix parent_account_id using a simple approach
UPDATE chart_of_accounts t
SET parent_account_id = p.id
FROM chart_of_accounts t_src, chart_of_accounts src_parent, chart_of_accounts p
WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001'
  AND t_src.company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
  AND t_src.account_code = t.account_code
  AND t_src.parent_account_id IS NOT NULL
  AND src_parent.id = t_src.parent_account_id
  AND p.company_id = 'a0000000-0000-0000-0000-000000000001'
  AND p.account_code = src_parent.account_code;

-- Step 5: Copy GL settings with mapped account IDs
INSERT INTO gl_settings (
  company_id, trade_receivable_account_id, trade_payable_account_id,
  sales_revenue_account_id, default_expense_account_id,
  customer_advance_account_id, wht_payable_account_id,
  bank_account_id, expense_account_id, tax_payable_account_id, input_tax_account_id
)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.trade_receivable_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.trade_payable_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.sales_revenue_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.default_expense_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.customer_advance_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.wht_payable_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.bank_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.expense_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.tax_payable_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1),
  (SELECT t.id FROM chart_of_accounts t JOIN chart_of_accounts s ON s.id = g.input_tax_account_id AND t.account_code = s.account_code WHERE t.company_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1)
FROM gl_settings g
WHERE g.company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
LIMIT 1;
