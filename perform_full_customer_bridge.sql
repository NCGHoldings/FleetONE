-- ============================================================
-- FULL FIX: Unified Customer Bridge — TARGETED AT NCG HOLDING
-- Explicitly uses the Live NCG Holding ID to prevent wrong company assignment
-- ============================================================

DO $$
DECLARE
    y_cust RECORD;
    s_cust RECORD;
    new_cust_id UUID;
    v_company_id UUID := 'a0000000-0000-0000-0000-000000000001'; -- NCG HOLDING ID
    v_yutong_cat_id UUID;
    v_sinotruck_cat_id UUID;
    v_counter INT := 1;
BEGIN
    -- Force re-migrate if they were assigned to the wrong company
    UPDATE yutong_customers SET accounting_customer_id = NULL;
    UPDATE sinotruck_customers SET accounting_customer_id = NULL;

    -- Delete wrongly assigned ones created by the script (safe cleanup)
    DELETE FROM customers WHERE source_module IN ('yutong', 'sinotruck');

    -- Seed Categories for NCG Holding
    INSERT INTO customer_categories (company_id, category_code, category_name, is_active)
    VALUES 
      (v_company_id, 'CAT-YUT', 'Yutong Bus Sales', true),
      (v_company_id, 'CAT-SNT', 'Sinotruck Sales', true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_yutong_cat_id FROM customer_categories WHERE category_code = 'CAT-YUT' AND company_id = v_company_id LIMIT 1;
    SELECT id INTO v_sinotruck_cat_id FROM customer_categories WHERE category_code = 'CAT-SNT' AND company_id = v_company_id LIMIT 1;

    -- MIGRATE YUTONG CUSTOMERS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yutong_customers') THEN
      FOR y_cust IN SELECT * FROM yutong_customers WHERE is_active = true
      LOOP
          BEGIN
              INSERT INTO public.customers (
                  company_id, business_unit_code, customer_category_id,
                  customer_code, customer_name, phone, email, billing_address,
                  customer_type, tax_id, business_registration_no,
                  source_module, source_record_id, created_at, updated_at
              ) VALUES (
                  v_company_id, 'YUT', v_yutong_cat_id,
                  'CUST-YUT-BRG-' || LPAD(v_counter::text, 4, '0'),
                  y_cust.company_name, y_cust.phone, y_cust.email, y_cust.address,
                  COALESCE(y_cust.customer_type, 'business'),
                  y_cust.tax_number, y_cust.business_registration_no,
                  'yutong', y_cust.id, y_cust.created_at, y_cust.updated_at
              )
              RETURNING id INTO new_cust_id;

              UPDATE yutong_customers SET accounting_customer_id = new_cust_id WHERE id = y_cust.id;
              v_counter := v_counter + 1;

          EXCEPTION WHEN unique_violation THEN
              UPDATE yutong_customers SET accounting_customer_id = (
                  SELECT id FROM public.customers
                  WHERE company_id = v_company_id AND normalized_phone = regexp_replace(regexp_replace(COALESCE(y_cust.phone, ''), '[\s\-\+\(\)]', '', 'g'), '^94', '0')
                  LIMIT 1
              ) WHERE id = y_cust.id;
          END;
      END LOOP;
    END IF;

    -- MIGRATE SINOTRUCK CUSTOMERS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sinotruck_customers') THEN
      FOR s_cust IN SELECT * FROM sinotruck_customers WHERE is_active = true
      LOOP
          BEGIN
              INSERT INTO public.customers (
                  company_id, business_unit_code, customer_category_id,
                  customer_code, customer_name, phone, email, billing_address,
                  customer_type, tax_id, business_registration_no,
                  source_module, source_record_id, created_at, updated_at
              ) VALUES (
                  v_company_id, 'SNT', v_sinotruck_cat_id,
                  'CUST-SNT-BRG-' || LPAD(v_counter::text, 4, '0'),
                  s_cust.company_name, s_cust.phone, s_cust.email, s_cust.address,
                  COALESCE(s_cust.customer_type, 'business'),
                  s_cust.tax_number, s_cust.business_registration_no,
                  'sinotruck', s_cust.id, s_cust.created_at, s_cust.updated_at
              )
              RETURNING id INTO new_cust_id;

              UPDATE sinotruck_customers SET accounting_customer_id = new_cust_id WHERE id = s_cust.id;
              v_counter := v_counter + 1;

          EXCEPTION WHEN unique_violation THEN
              UPDATE sinotruck_customers SET accounting_customer_id = (
                  SELECT id FROM public.customers
                  WHERE company_id = v_company_id AND normalized_phone = regexp_replace(regexp_replace(COALESCE(s_cust.phone, ''), '[\s\-\+\(\)]', '', 'g'), '^94', '0')
                  LIMIT 1
              ) WHERE id = s_cust.id;
          END;
      END LOOP;
    END IF;

    RAISE NOTICE 'Explicit NCG Holding Bridge Migration Executed!';
END;
$$ LANGUAGE plpgsql;
