-- =====================================================================
-- Fix Katunayaka (and all SBO branches) AR posting:
--   1. Re-map school_bus_finance_settings to NCG Holding COA IDs
--   2. Migrate customer SBS-LKA to NCG Holding company
--   3. Re-point existing JE lines (33 orphans from 2026-04-21) to NCG Holding COA
--   4. Backfill ar_invoices for the 33 orphan school_ar_invoices and link
--   5. Recompute current_balance for affected COA accounts (both Test & Holding)
-- =====================================================================

DO $$
DECLARE
  v_holding_co       uuid := 'a0000000-0000-0000-0000-000000000001';
  v_test_co          uuid := 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';
  v_settings_co      uuid := '0fba4a2f-598b-47e8-b863-283d00380b06';

  v_test_tr          uuid := 'cce9995e-9a2b-4acc-81f3-776e5bfa17d2';
  v_test_sales       uuid := '19891c60-a0ac-46f1-939d-15eb1bf88fba';
  v_test_advance     uuid := '8c6b8e22-596b-4e90-bd63-d09e88159f3f';

  v_hold_tr          uuid := 'a1678110-362a-4e45-8014-350e49620b8f';
  v_hold_sales       uuid := '753cb8f4-23bb-4648-a846-5c2c37f44ec8';
  v_hold_advance     uuid := 'ffe5f2b1-c2ad-4598-874d-153852a55646';

  v_customer_id      uuid;
  r                  record;
  v_new_ar_id        uuid;
  v_paid             numeric;
  v_balance          numeric;
  v_status           text;
  v_due_date         date;
BEGIN
  -- 1. Re-map ALL SBO settings rows that point to Test COA → NCG Holding COA
  UPDATE school_bus_finance_settings
  SET trade_receivable_account_id = v_hold_tr,
      sbs_collection_account_id   = v_hold_sales,
      advance_payments_liability_account_id = v_hold_advance,
      updated_at = now()
  WHERE company_id = v_settings_co
    AND (trade_receivable_account_id = v_test_tr
      OR sbs_collection_account_id   = v_test_sales
      OR advance_payments_liability_account_id = v_test_advance);

  -- 2. Migrate the existing SBS-LKA customer from Test → NCG Holding
  --    (customer_code is globally UNIQUE so we move rather than duplicate)
  UPDATE customers
  SET company_id = v_holding_co,
      updated_at = now()
  WHERE customer_code = 'SBS-LKA'
    AND business_unit_code = 'SBO'
    AND company_id = v_test_co;

  SELECT id INTO v_customer_id
  FROM customers
  WHERE customer_code = 'SBS-LKA' AND business_unit_code = 'SBO'
  LIMIT 1;

  -- 3. Re-point the orphan JE lines from Test COA → NCG Holding COA
  UPDATE journal_entry_lines jel
  SET account_id = CASE
        WHEN jel.account_id = v_test_tr    THEN v_hold_tr
        WHEN jel.account_id = v_test_sales THEN v_hold_sales
        WHEN jel.account_id = v_test_advance THEN v_hold_advance
        ELSE jel.account_id
      END,
      company_id = v_holding_co
  FROM school_ar_invoices sai
  WHERE jel.journal_entry_id = sai.journal_entry_id
    AND sai.ar_invoice_id IS NULL
    AND sai.created_at::date = '2026-04-21'
    AND jel.account_id IN (v_test_tr, v_test_sales, v_test_advance);

  -- 4. Backfill ar_invoices for the orphan school_ar_invoices and link back
  IF v_customer_id IS NOT NULL THEN
    FOR r IN
      SELECT sai.id            AS sai_id,
             sai.invoice_number,
             sai.amount,
             sai.paid_amount,
             sai.status,
             sai.journal_entry_id,
             sai.invoice_month,
             sai.created_at,
             sst.student_name
      FROM school_ar_invoices sai
      LEFT JOIN school_students sst ON sst.id = sai.student_id
      WHERE sai.ar_invoice_id IS NULL
        AND sai.created_at::date = '2026-04-21'
    LOOP
      v_paid    := COALESCE(r.paid_amount, 0);
      v_balance := COALESCE(r.amount, 0) - v_paid;
      v_status  := CASE
                     WHEN v_paid >= COALESCE(r.amount, 0) AND COALESCE(r.amount,0) > 0 THEN 'paid'
                     WHEN v_paid > 0 THEN 'partial'
                     ELSE 'unpaid'
                   END;
      v_due_date := (r.created_at::date + INTERVAL '30 days')::date;

      INSERT INTO ar_invoices (
        company_id, business_unit_code, customer_id,
        invoice_number, invoice_date, due_date,
        total_amount, balance, paid_amount, status,
        reference, notes, journal_entry_id
      ) VALUES (
        v_holding_co, 'SBO', v_customer_id,
        r.invoice_number, r.created_at::date, v_due_date,
        r.amount, v_balance, v_paid, v_status,
        COALESCE(r.student_name, '') || ' - ' || to_char(r.invoice_month, 'Mon YYYY'),
        'School Bus AR backfill for ' || COALESCE(r.student_name, 'student'),
        r.journal_entry_id
      )
      RETURNING id INTO v_new_ar_id;

      UPDATE school_ar_invoices SET ar_invoice_id = v_new_ar_id WHERE id = r.sai_id;
    END LOOP;
  END IF;

  -- 5. Recompute current_balance from journal_entry_lines for the affected COA accounts
  --    (do this for BOTH Test and Holding accounts since balances moved between them)
  WITH sums AS (
    SELECT jel.account_id,
           SUM(COALESCE(jel.debit,0))  AS d,
           SUM(COALESCE(jel.credit,0)) AS c
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.status = 'posted'
      AND jel.account_id IN (v_test_tr, v_test_sales, v_test_advance,
                             v_hold_tr, v_hold_sales, v_hold_advance)
    GROUP BY jel.account_id
  )
  UPDATE chart_of_accounts coa
  SET current_balance = CASE
        WHEN coa.account_type IN ('asset','expense') THEN sums.d - sums.c
        ELSE sums.c - sums.d
      END,
      updated_at = now()
  FROM sums
  WHERE coa.id = sums.account_id;

  -- Also zero out accounts that have no posted lines anymore
  UPDATE chart_of_accounts
  SET current_balance = 0, updated_at = now()
  WHERE id IN (v_test_tr, v_test_sales, v_test_advance,
               v_hold_tr, v_hold_sales, v_hold_advance)
    AND id NOT IN (
      SELECT DISTINCT jel.account_id
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE je.status = 'posted'
    );
END $$;