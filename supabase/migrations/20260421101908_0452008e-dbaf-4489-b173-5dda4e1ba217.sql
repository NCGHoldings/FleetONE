
-- 1) Live School Bus Operations needs short_code = 'SBO' (currently NULL)
UPDATE companies
SET short_code = 'SBO'
WHERE id = 'a0000000-0000-0000-0000-000000000002'
  AND (short_code IS NULL OR short_code = '');

-- Test School Bus must NOT have SBO short_code anymore (avoid collision)
UPDATE companies
SET short_code = 'TST-SBO'
WHERE id = '0fba4a2f-598b-47e8-b863-283d00380b06'
  AND short_code = 'SBO';

-- 2) Move SBO finance settings from Test School Bus -> live School Bus Operations
UPDATE school_bus_finance_settings
SET company_id = 'a0000000-0000-0000-0000-000000000002'
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- 3) Re-point branch_gl_account_id from Test bank accounts to live NCG Holding equivalents
UPDATE school_bus_finance_settings
SET branch_gl_account_id = 'f98c1d06-f824-42ec-9dc2-47d39cec1ea1'
WHERE branch_gl_account_id = '30e46265-5ea1-4f9f-8be9-6fc781d6efed';

UPDATE school_bus_finance_settings
SET branch_gl_account_id = '5a48ae07-19e0-46d8-bd5c-1adc371d3d63'
WHERE branch_gl_account_id = 'f9dfea0f-830c-4318-9255-a9592471855b';

UPDATE school_bus_finance_settings
SET branch_gl_account_id = '9b3a2559-e73f-45ae-82e3-3c2326a582f1'
WHERE branch_gl_account_id = '8a348132-41e0-4343-a0c7-1174f8366da0';

-- 4) Migrate Katunayaka school AR batches over to live School Bus Operations
UPDATE school_ar_invoice_batches
SET company_id = 'a0000000-0000-0000-0000-000000000002'
WHERE branch_id = 'ec775f69-b7e8-4e4c-86f1-2e889791a8fd'
  AND company_id IN ('0fba4a2f-598b-47e8-b863-283d00380b06','f40b0a9d-ae5b-41b3-9188-535ae94c9020');

-- 4a) Migrate linked AR invoices over to NCG Holding
UPDATE ar_invoices
SET company_id = 'a0000000-0000-0000-0000-000000000001',
    business_unit_code = 'SBO'
WHERE id IN (
  SELECT sai.ar_invoice_id
  FROM school_ar_invoices sai
  JOIN school_ar_invoice_batches b ON b.id = sai.batch_id
  WHERE b.branch_id = 'ec775f69-b7e8-4e4c-86f1-2e889791a8fd'
    AND sai.ar_invoice_id IS NOT NULL
)
AND company_id IN ('0fba4a2f-598b-47e8-b863-283d00380b06','f40b0a9d-ae5b-41b3-9188-535ae94c9020');

-- 4b) Migrate JEs over to NCG Holding
UPDATE journal_entries
SET company_id = 'a0000000-0000-0000-0000-000000000001',
    business_unit_code = 'SBO'
WHERE id IN (
  SELECT sai.journal_entry_id
  FROM school_ar_invoices sai
  JOIN school_ar_invoice_batches b ON b.id = sai.batch_id
  WHERE b.branch_id = 'ec775f69-b7e8-4e4c-86f1-2e889791a8fd'
    AND sai.journal_entry_id IS NOT NULL
)
AND company_id IN ('0fba4a2f-598b-47e8-b863-283d00380b06','f40b0a9d-ae5b-41b3-9188-535ae94c9020');

-- 4c) Align JE lines for those entries to NCG Holding
UPDATE journal_entry_lines
SET company_id = 'a0000000-0000-0000-0000-000000000001'
WHERE journal_entry_id IN (
  SELECT sai.journal_entry_id
  FROM school_ar_invoices sai
  JOIN school_ar_invoice_batches b ON b.id = sai.batch_id
  WHERE b.branch_id = 'ec775f69-b7e8-4e4c-86f1-2e889791a8fd'
    AND sai.journal_entry_id IS NOT NULL
)
AND company_id IN ('0fba4a2f-598b-47e8-b863-283d00380b06','f40b0a9d-ae5b-41b3-9188-535ae94c9020');

-- 5) Anchor SBS-LKA customer to NCG Holding
UPDATE customers
SET company_id = 'a0000000-0000-0000-0000-000000000001'
WHERE customer_code = 'SBS-LKA'
  AND business_unit_code = 'SBO'
  AND company_id <> 'a0000000-0000-0000-0000-000000000001';

-- 6) Backfill missing AR invoices for orphan Katunayaka school invoices
DO $$
DECLARE
  v_customer_id uuid;
  v_rec record;
  v_new_ar_id uuid;
  v_existing_id uuid;
  v_due_date date;
  v_status text;
BEGIN
  SELECT id INTO v_customer_id FROM customers
   WHERE customer_code = 'SBS-LKA' AND business_unit_code = 'SBO'
   LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'SBS-LKA customer not found';
  END IF;

  FOR v_rec IN (
    SELECT sai.id, sai.invoice_number, sai.amount, sai.invoice_month,
           sai.journal_entry_id, sai.paid_amount
    FROM school_ar_invoices sai
    JOIN school_ar_invoice_batches b ON b.id = sai.batch_id
    WHERE b.branch_id = 'ec775f69-b7e8-4e4c-86f1-2e889791a8fd'
      AND sai.ar_invoice_id IS NULL
  ) LOOP
    -- Check if an AR invoice with this number already exists
    SELECT id INTO v_existing_id FROM ar_invoices WHERE invoice_number = v_rec.invoice_number LIMIT 1;

    v_due_date := (v_rec.invoice_month::date + INTERVAL '30 days')::date;
    v_status := CASE
      WHEN COALESCE(v_rec.paid_amount,0) >= v_rec.amount THEN 'paid'
      WHEN COALESCE(v_rec.paid_amount,0) > 0 THEN 'partial'
      ELSE 'unpaid' END;

    IF v_existing_id IS NOT NULL THEN
      UPDATE ar_invoices
        SET company_id = 'a0000000-0000-0000-0000-000000000001',
            business_unit_code = 'SBO',
            customer_id = v_customer_id,
            journal_entry_id = COALESCE(journal_entry_id, v_rec.journal_entry_id)
      WHERE id = v_existing_id;
      v_new_ar_id := v_existing_id;
    ELSE
      INSERT INTO ar_invoices (
        company_id, business_unit_code, customer_id, invoice_number,
        invoice_date, due_date, total_amount, balance, paid_amount,
        status, journal_entry_id, notes
      ) VALUES (
        'a0000000-0000-0000-0000-000000000001', 'SBO', v_customer_id, v_rec.invoice_number,
        v_rec.invoice_month::date, v_due_date, v_rec.amount,
        GREATEST(v_rec.amount - COALESCE(v_rec.paid_amount,0), 0),
        COALESCE(v_rec.paid_amount,0),
        v_status,
        v_rec.journal_entry_id,
        'Backfilled AR invoice (Katunayaka batch repair)'
      ) RETURNING id INTO v_new_ar_id;
    END IF;

    UPDATE school_ar_invoices SET ar_invoice_id = v_new_ar_id WHERE id = v_rec.id;
  END LOOP;
END $$;

-- 7) Recompute COA current_balance for the affected accounts based on posted JE lines
DO $$
DECLARE
  v_acc record;
  v_new_balance numeric;
BEGIN
  FOR v_acc IN (
    SELECT id, account_type FROM chart_of_accounts
    WHERE id IN (
      'a1678110-362a-4e45-8014-350e49620b8f',
      '753cb8f4-23bb-4648-a846-5c2c37f44ec8',
      'ffe5f2b1-c2ad-4598-874d-153852a55646'
    )
  ) LOOP
    SELECT
      CASE WHEN v_acc.account_type IN ('asset','expense')
           THEN COALESCE(SUM(COALESCE(jel.debit,0) - COALESCE(jel.credit,0)),0)
           ELSE COALESCE(SUM(COALESCE(jel.credit,0) - COALESCE(jel.debit,0)),0)
      END
      INTO v_new_balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = v_acc.id AND je.status = 'posted';

    UPDATE chart_of_accounts
       SET current_balance = COALESCE(v_new_balance,0),
           updated_at = now()
     WHERE id = v_acc.id;
  END LOOP;
END $$;
