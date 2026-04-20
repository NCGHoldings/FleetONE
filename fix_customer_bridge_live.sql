-- ============================================================
-- PART 1: Unified Customer Bridge — Schema Enhancements
-- Adds missing columns, triggers, indexes for the customer bridge
-- Safe to re-run (all IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- 1. Add source tracking and identity columns to the central customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_module TEXT DEFAULT 'accounting';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_record_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nic_passport TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_registration_no TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT;

-- 2. Phone Normalization Trigger
CREATE OR REPLACE FUNCTION normalize_customer_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.normalized_phone := regexp_replace(
      regexp_replace(
        COALESCE(NEW.phone, ''),
        '[\s\-\+\(\)]', '', 'g'
      ),
      '^94', '0'
    );
  ELSE
    NEW.normalized_phone := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_customer_phone ON customers;
CREATE TRIGGER trg_normalize_customer_phone
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_customer_phone();

-- 3. Unique constraint: prevent duplicate customers with the same phone within a company
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unique_phone
  ON customers (company_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone != '';

-- 4. Bridge FK columns on Yutong and Sinotruck customer tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yutong_customers') THEN
    BEGIN
      ALTER TABLE yutong_customers ADD COLUMN IF NOT EXISTS accounting_customer_id UUID;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_yutong_accounting_customer'
      ) THEN
        ALTER TABLE yutong_customers
          ADD CONSTRAINT fk_yutong_accounting_customer
          FOREIGN KEY (accounting_customer_id) REFERENCES customers(id)
          ON DELETE SET NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'yutong_customers bridge column: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sinotruck_customers') THEN
    BEGIN
      ALTER TABLE sinotruck_customers ADD COLUMN IF NOT EXISTS accounting_customer_id UUID;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sinotruck_accounting_customer'
      ) THEN
        ALTER TABLE sinotruck_customers
          ADD CONSTRAINT fk_sinotruck_accounting_customer
          FOREIGN KEY (accounting_customer_id) REFERENCES customers(id)
          ON DELETE SET NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'sinotruck_customers bridge column: %', SQLERRM;
    END;
  END IF;
END $$;

-- 5. Backfill normalized_phone for ALL existing central customers
UPDATE customers
SET normalized_phone = regexp_replace(
  regexp_replace(
    COALESCE(phone, ''),
    '[\s\-\+\(\)]', '', 'g'
  ),
  '^94', '0'
)
WHERE normalized_phone IS NULL
  AND phone IS NOT NULL
  AND phone != '';

-- 6. Seed Customer Categories for each business unit
DO $$
DECLARE
  v_company_id UUID;
  v_category_names TEXT[] := ARRAY[
    'Yutong Bus Sales',
    'Sinotruck Sales',
    'Special Hire Services',
    'School Bus Services',
    'Light Vehicle Sales'
  ];
  v_category_codes TEXT[] := ARRAY[
    'CAT-YUT',
    'CAT-SNT',
    'CAT-SHR',
    'CAT-SCH',
    'CAT-LTV'
  ];
  v_i INT;
BEGIN
  SELECT id INTO v_company_id FROM companies ORDER BY created_at ASC LIMIT 1;

  IF v_company_id IS NOT NULL THEN
    FOR v_i IN 1..array_length(v_category_names, 1) LOOP
      INSERT INTO customer_categories (
        company_id,
        category_code,
        category_name,
        is_active
      )
      VALUES (
        v_company_id,
        v_category_codes[v_i],
        v_category_names[v_i],
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;


-- ============================================================
-- PART 2: Migrate Existing Operation Customers to Accounting
-- Copies Yutong & Sinotruck customers into the central table
-- ============================================================

DO $$
DECLARE
    y_cust RECORD;
    s_cust RECORD;
    new_cust_id UUID;
    v_company_id UUID;
BEGIN
    SELECT id INTO v_company_id FROM companies ORDER BY created_at ASC LIMIT 1;

    -- 1. Migrate Yutong Customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yutong_customers') THEN
      FOR y_cust IN SELECT * FROM yutong_customers WHERE accounting_customer_id IS NULL AND is_active = true
      LOOP
          BEGIN
              INSERT INTO public.customers (
                  company_id, business_unit_code, customer_name, phone, email, billing_address,
                  customer_type, tax_id, business_registration_no,
                  source_module, source_record_id, created_at, updated_at
              ) VALUES (
                  v_company_id, 'YUT',
                  y_cust.company_name, y_cust.phone, y_cust.email, y_cust.address,
                  COALESCE(y_cust.customer_type, 'business'),
                  y_cust.tax_number, y_cust.business_registration_no,
                  'yutong', y_cust.id, y_cust.created_at, y_cust.updated_at
              )
              RETURNING id INTO new_cust_id;

              UPDATE yutong_customers SET accounting_customer_id = new_cust_id WHERE id = y_cust.id;

          EXCEPTION WHEN unique_violation THEN
              -- Duplicate phone — link to existing
              SELECT id INTO new_cust_id FROM public.customers
              WHERE company_id = v_company_id
                AND normalized_phone IS NOT NULL
                AND normalized_phone = regexp_replace(
                    regexp_replace(COALESCE(y_cust.phone, ''), '[\s\-\+\(\)]', '', 'g'),
                    '^94', '0'
                )
              LIMIT 1;

              IF new_cust_id IS NOT NULL THEN
                  UPDATE yutong_customers SET accounting_customer_id = new_cust_id WHERE id = y_cust.id;
              END IF;
          END;
      END LOOP;
    END IF;

    -- 2. Migrate Sinotruck Customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sinotruck_customers') THEN
      FOR s_cust IN SELECT * FROM sinotruck_customers WHERE accounting_customer_id IS NULL AND is_active = true
      LOOP
          BEGIN
              INSERT INTO public.customers (
                  company_id, business_unit_code, customer_name, phone, email, billing_address,
                  customer_type, tax_id, business_registration_no,
                  source_module, source_record_id, created_at, updated_at
              ) VALUES (
                  v_company_id, 'SNT',
                  s_cust.company_name, s_cust.phone, s_cust.email, s_cust.address,
                  COALESCE(s_cust.customer_type, 'business'),
                  s_cust.tax_number, s_cust.business_registration_no,
                  'sinotruck', s_cust.id, s_cust.created_at, s_cust.updated_at
              )
              RETURNING id INTO new_cust_id;

              UPDATE sinotruck_customers SET accounting_customer_id = new_cust_id WHERE id = s_cust.id;

          EXCEPTION WHEN unique_violation THEN
              SELECT id INTO new_cust_id FROM public.customers
              WHERE company_id = v_company_id
                AND normalized_phone IS NOT NULL
                AND normalized_phone = regexp_replace(
                    regexp_replace(COALESCE(s_cust.phone, ''), '[\s\-\+\(\)]', '', 'g'),
                    '^94', '0'
                )
              LIMIT 1;

              IF new_cust_id IS NOT NULL THEN
                  UPDATE sinotruck_customers SET accounting_customer_id = new_cust_id WHERE id = s_cust.id;
              END IF;
          END;
      END LOOP;
    END IF;

    RAISE NOTICE 'Customer bridge migration complete!';
END;
$$ LANGUAGE plpgsql;
