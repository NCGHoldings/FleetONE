-- ============================================================
-- Unified Customer Bridge: Schema Enhancements
-- Links Yutong, Sinotruck, Special Hire, School Bus customers
-- to the central Accounting "customers" table.
-- ============================================================

-- 1. Add source tracking and identity columns to the central customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_module TEXT DEFAULT 'accounting';
  -- Values: 'accounting', 'yutong', 'sinotruck', 'light_vehicle', 'special_hire', 'school_bus'

ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_record_id UUID;
  -- Points back to the originating record (yutong_customers.id, etc.)

ALTER TABLE customers ADD COLUMN IF NOT EXISTS nic_passport TEXT;
  -- NIC (National Identity Card) or Passport number for individuals

ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_registration_no TEXT;
  -- Business Registration Number for corporate customers

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual';
  -- 'individual', 'business', 'government'

ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT;
  -- Phone stripped of spaces/dashes/+94 prefix for deduplication

-- 2. Phone Normalization Trigger
--    Automatically strips spaces, dashes, + signs, and leading "94" country code
--    so that "077 123 4567", "+94771234567", "0771234567" all normalize to "0771234567"
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

-- Drop existing trigger if present, then create
DROP TRIGGER IF EXISTS trg_normalize_customer_phone ON customers;
CREATE TRIGGER trg_normalize_customer_phone
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_customer_phone();

-- 3. Unique constraint: prevent duplicate customers with the same phone within a company
--    Only enforces when normalized_phone is non-null and non-empty
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unique_phone
  ON customers (company_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone != '';

-- 4. Bridge FK columns on sales module customer tables
--    These link each Yutong/Sinotruck customer record to their central accounting customer
DO $$
BEGIN
  -- yutong_customers bridge
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yutong_customers') THEN
    BEGIN
      ALTER TABLE yutong_customers ADD COLUMN IF NOT EXISTS accounting_customer_id UUID;
      -- Add FK constraint only if not already present
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

  -- sinotruck_customers bridge
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
--    These auto-map customers to the correct GL accounts on sync
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
  -- Find the NCG Holdings parent company (or first company)
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

-- Done! The schema is now ready for the Customer Bridge hook.
