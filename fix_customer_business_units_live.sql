-- ============================================================
-- FIX: Update missing business_unit_code and customer_category_id
-- for customers migrated from Yutong and Sinotruck modules
-- ============================================================

DO $$
DECLARE
  v_yutong_cat_id UUID;
  v_sinotruck_cat_id UUID;
  v_company_id UUID;
BEGIN
  -- Get the main company ID
  SELECT id INTO v_company_id FROM companies ORDER BY created_at ASC LIMIT 1;

  -- Re-seed categories just in case
  INSERT INTO customer_categories (company_id, category_code, category_name, is_active)
  VALUES 
    (v_company_id, 'CAT-YUT', 'Yutong Bus Sales', true),
    (v_company_id, 'CAT-SNT', 'Sinotruck Sales', true)
  ON CONFLICT DO NOTHING;

  -- Get category IDs
  SELECT id INTO v_yutong_cat_id FROM customer_categories WHERE category_code = 'CAT-YUT' AND company_id = v_company_id LIMIT 1;
  SELECT id INTO v_sinotruck_cat_id FROM customer_categories WHERE category_code = 'CAT-SNT' AND company_id = v_company_id LIMIT 1;

  -- Update Yutong customers
  UPDATE customers
  SET business_unit_code = 'YUT',
      customer_category_id = v_yutong_cat_id
  WHERE source_module = 'yutong'
     OR id IN (SELECT accounting_customer_id FROM yutong_customers WHERE accounting_customer_id IS NOT NULL);

  -- Update Sinotruck customers
  UPDATE customers
  SET business_unit_code = 'SNT',
      customer_category_id = v_sinotruck_cat_id
  WHERE source_module = 'sinotruck'
     OR id IN (SELECT accounting_customer_id FROM sinotruck_customers WHERE accounting_customer_id IS NOT NULL);

  RAISE NOTICE 'Updated business_unit_code and customer_category_id for bridged customers.';
END $$;
