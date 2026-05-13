-- ============================================================================
-- Fix: Remediate Yutong AR Invoice Customer Mapping
-- ============================================================================
-- Problem: createVehicleCustomer had a "global fallback" that matched customers
-- across modules. E.g., a Light Vehicle customer "E R T PERERA" got linked to
-- Yutong orders, resulting in incorrect customer names on AR invoices.
--
-- Solution: For every Yutong AR invoice linked via yutong_orders.ar_invoice_id,
-- verify the customer_id matches the quotation's customer_name. If not, find
-- or create the correct YUT-scoped customer and re-link both the AR invoice
-- and the yutong_order.
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  correct_customer_id UUID;
  new_customer_code TEXT;
  fix_count INT := 0;
BEGIN
  -- Loop through all Yutong orders that have an AR invoice linked
  FOR rec IN
    SELECT
      yo.id AS order_id,
      yo.order_no,
      yo.ar_invoice_id,
      yo.finance_customer_id,
      yq.customer_name AS expected_name,
      yq.customer_phone AS expected_phone,
      yq.customer_email AS expected_email,
      yq.customer_category_id AS expected_category_id,
      ar.customer_id AS current_customer_id,
      ar.invoice_number,
      c.customer_name AS current_name,
      c.business_unit_code AS current_bu
    FROM yutong_orders yo
    JOIN yutong_quotations yq ON yo.quotation_id = yq.id
    JOIN ar_invoices ar ON yo.ar_invoice_id = ar.id
    LEFT JOIN customers c ON ar.customer_id = c.id
    WHERE yo.ar_invoice_id IS NOT NULL
      AND yq.customer_name IS NOT NULL
      -- Mismatch: current customer name ≠ quotation customer name
      AND LOWER(TRIM(COALESCE(c.customer_name, ''))) != LOWER(TRIM(yq.customer_name))
  LOOP
    RAISE NOTICE '[YT FIX] Invoice % — current: "%" should be: "%"',
      rec.invoice_number, rec.current_name, rec.expected_name;

    -- Step 1: Try to find an existing YUT-scoped customer with the correct name
    SELECT id INTO correct_customer_id
    FROM customers
    WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
      AND business_unit_code = 'YUT'
      AND LOWER(TRIM(customer_name)) = LOWER(TRIM(rec.expected_name))
    LIMIT 1;

    -- Step 2: If not found, create a new YUT-scoped customer
    -- ⚠️ Phone/email are intentionally OMITTED to avoid idx_customers_unique_phone conflicts
    --    (e.g. normalized_phone = '000' already exists for another customer)
    IF correct_customer_id IS NULL THEN
      new_customer_code := 'YUT-FIX-' || UPPER(SUBSTRING(md5(rec.expected_name) FROM 1 FOR 8));

      BEGIN
        INSERT INTO customers (
          company_id, customer_code, customer_name,
          customer_type, customer_category_id, business_unit_code, is_active
        ) VALUES (
          'a0000000-0000-0000-0000-000000000001',
          new_customer_code,
          rec.expected_name,
          'individual',
          rec.expected_category_id,
          'YUT',
          TRUE
        )
        ON CONFLICT (customer_code) DO NOTHING
        RETURNING id INTO correct_customer_id;
      EXCEPTION WHEN unique_violation THEN
        -- If any other unique constraint fires, just look up by name
        RAISE NOTICE '[YT FIX] Constraint conflict for %, falling back to name lookup', rec.expected_name;
      END;

      -- If ON CONFLICT hit or exception, fetch the existing one
      IF correct_customer_id IS NULL THEN
        SELECT id INTO correct_customer_id
        FROM customers
        WHERE customer_code = new_customer_code
        LIMIT 1;
      END IF;

      -- Final fallback: any YUT customer with the right name
      IF correct_customer_id IS NULL THEN
        SELECT id INTO correct_customer_id
        FROM customers
        WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
          AND LOWER(TRIM(customer_name)) = LOWER(TRIM(rec.expected_name))
        LIMIT 1;
      END IF;

      IF correct_customer_id IS NOT NULL THEN
        RAISE NOTICE '[YT FIX] Resolved customer for "%": %', rec.expected_name, correct_customer_id;
      ELSE
        RAISE NOTICE '[YT FIX] ⚠️ Could not create or find customer for "%"', rec.expected_name;
      END IF;
    END IF;

    -- Step 3: Update AR Invoice to point to correct customer
    IF correct_customer_id IS NOT NULL THEN
      UPDATE ar_invoices
      SET customer_id = correct_customer_id,
          updated_at = NOW()
      WHERE id = rec.ar_invoice_id;

      -- Step 4: Update order's finance_customer_id
      UPDATE yutong_orders
      SET finance_customer_id = correct_customer_id,
          updated_at = NOW()
      WHERE id = rec.order_id;

      fix_count := fix_count + 1;
      RAISE NOTICE '[YT FIX] ✅ Fixed invoice %: customer_id → % ("%")',
        rec.invoice_number, correct_customer_id, rec.expected_name;
    END IF;
  END LOOP;

  RAISE NOTICE '[YT FIX] ============================================';
  RAISE NOTICE '[YT FIX] Total fixed: % invoice(s)', fix_count;
  RAISE NOTICE '[YT FIX] ============================================';
END $$;

-- Verify the fix: Show all Yutong AR invoices with their customer names
SELECT
  ar.invoice_number,
  c.customer_name,
  c.business_unit_code,
  yq.customer_name AS quotation_customer,
  CASE
    WHEN LOWER(TRIM(c.customer_name)) = LOWER(TRIM(yq.customer_name)) THEN '✅ Match'
    ELSE '❌ MISMATCH'
  END AS status
FROM yutong_orders yo
JOIN yutong_quotations yq ON yo.quotation_id = yq.id
JOIN ar_invoices ar ON yo.ar_invoice_id = ar.id
LEFT JOIN customers c ON ar.customer_id = c.id
WHERE yo.ar_invoice_id IS NOT NULL
ORDER BY ar.invoice_number;
