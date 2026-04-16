-- Migration to seed missing GL settings for companies that don't have them
-- This copies the default account configuration from NCG Holding (Pvt) Ltd
-- to SBO, SPH, SNT, YUT, and any other newly created companies without GL settings.

DO $$ 
DECLARE
  -- UUID of NCG Holding (from previous query results)
  holding_id uuid := 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'; 
  holding_settings record;
  comp record;
BEGIN
  -- 1. Grab the template settings from NCG Holding
  SELECT * INTO holding_settings FROM gl_settings WHERE company_id = holding_id LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NCG Holding GL Settings not found. Cannot copy templates.';
  END IF;

  -- 2. Loop through all companies that DO NOT currently have gl_settings
  FOR comp IN SELECT id, name FROM companies WHERE id NOT IN (SELECT company_id FROM gl_settings) LOOP
    RAISE NOTICE 'Seeding default GL settings for company: %', comp.name;
    
    INSERT INTO gl_settings (
      company_id,
      trade_receivable_account_id,
      trade_payable_account_id,
      sales_revenue_account_id,
      default_expense_account_id,
      tax_payable_account_id,
      input_tax_account_id,
      customer_advance_account_id,
      wht_payable_account_id
    ) VALUES (
      comp.id,
      holding_settings.trade_receivable_account_id,
      holding_settings.trade_payable_account_id,
      holding_settings.sales_revenue_account_id,
      holding_settings.default_expense_account_id,
      holding_settings.tax_payable_account_id,
      holding_settings.input_tax_account_id,
      holding_settings.customer_advance_account_id,
      holding_settings.wht_payable_account_id
    ) ON CONFLICT (company_id) DO NOTHING;
  END LOOP;
  
  -- 3. Also fix Light Vehicle (LTV) missing accounts if needed
  -- (It was missing wht_payable and bank_account_id, though LTV has an ID: ac957087-0224-4149-b231-7aa9e6a3aea1)
  UPDATE gl_settings 
  SET wht_payable_account_id = holding_settings.wht_payable_account_id
  WHERE wht_payable_account_id IS NULL;

END $$;
