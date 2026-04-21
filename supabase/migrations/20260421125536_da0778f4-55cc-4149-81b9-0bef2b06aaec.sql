DO $mig$
DECLARE
  v_archive_schema text := '_archive_april_sbo_' || to_char(now(),'YYYYMMDD_HH24MISS');
  v_company_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_dr_account uuid := 'a1678110-362a-4e45-8014-350e49620b8f';
  v_cr_account uuid := '753cb8f4-23bb-4648-a846-5c2c37f44ec8';
  v_katu_branch uuid := 'ec775f69-b7e8-4e4c-86f1-2e889791a8fd';
  v_katu_customer uuid := '9de22a75-ea27-4ad2-bf12-d2f8708f4c27';
  v_batch_id uuid := gen_random_uuid();
  v_student record;
  v_je_id uuid;
  v_ar_id uuid;
  v_seq int;
  v_amount numeric;
  v_invoice_no text;
  v_je_no text;
  v_total_count int;
  v_total_amount numeric;
  v_batch_total numeric := 0;
  v_batch_count int := 0;
BEGIN
  CREATE TEMP TABLE _del_ar ON COMMIT DROP AS
  SELECT ai.id as ar_id, ai.journal_entry_id as je_id
  FROM ar_invoices ai
  JOIN school_ar_invoices sai ON sai.ar_invoice_id = ai.id
  JOIN school_students s ON s.id = sai.student_id
  WHERE ai.business_unit_code = 'SBO'
    AND ai.invoice_date BETWEEN '2026-04-01' AND '2026-04-30'
    AND (
      s.branch_id IN ('dd387300-dc45-4c1e-ae24-933750c78a8e','1d8c5ca6-a9bd-4641-b1d6-a48d9803b106','4b0dcd34-3e24-40e7-ac51-82d6abcff116','9e238f89-d707-43d5-8029-b0b2ec469175')
      OR (s.branch_id = v_katu_branch AND ai.invoice_date IN ('2026-04-06','2026-04-09','2026-04-21'))
    );

  CREATE TEMP TABLE _del_je ON COMMIT DROP AS
  WITH RECURSIVE seed AS (SELECT je_id as id FROM _del_ar WHERE je_id IS NOT NULL),
  expanded AS (
    SELECT id FROM seed
    UNION
    SELECT je.id FROM journal_entries je JOIN expanded e ON je.reversed_entry_id = e.id
  )
  SELECT DISTINCT id as je_id FROM expanded;

  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_archive_schema);
  EXECUTE format($f$CREATE TABLE %I.ar_invoices_snapshot AS SELECT * FROM ar_invoices WHERE id IN (SELECT ar_id FROM _del_ar)$f$, v_archive_schema);
  EXECUTE format($f$CREATE TABLE %I.school_ar_invoices_snapshot AS SELECT * FROM school_ar_invoices WHERE ar_invoice_id IN (SELECT ar_id FROM _del_ar)$f$, v_archive_schema);
  EXECUTE format($f$CREATE TABLE %I.journal_entries_snapshot AS SELECT * FROM journal_entries WHERE id IN (SELECT je_id FROM _del_je) OR (business_unit_code='SBO' AND entry_date BETWEEN '2026-04-01' AND '2026-04-30' AND total_debit=0)$f$, v_archive_schema);
  EXECUTE format($f$CREATE TABLE %I.journal_entry_lines_snapshot AS SELECT * FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM %I.journal_entries_snapshot)$f$, v_archive_schema, v_archive_schema);

  -- Step 2: Receipts
  CREATE TEMP TABLE _del_receipt_je ON COMMIT DROP AS
  SELECT DISTINCT r.journal_entry_id as je_id, r.id as receipt_id
  FROM ar_receipts r
  WHERE r.id IN (SELECT receipt_id FROM ar_receipt_allocations
    WHERE invoice_id IN ('b58cce2b-ecf1-4fca-93f4-e04b55ca5b77','332eb905-e5d7-4463-b596-6f71b74c09b2','5acfc7d7-0abc-475d-9f46-66993f055abb','7e27c75d-9cf2-44ff-8167-2be080237233'));
  DELETE FROM ar_receipt_allocations WHERE invoice_id IN ('b58cce2b-ecf1-4fca-93f4-e04b55ca5b77','332eb905-e5d7-4463-b596-6f71b74c09b2','5acfc7d7-0abc-475d-9f46-66993f055abb','7e27c75d-9cf2-44ff-8167-2be080237233');
  DELETE FROM ar_receipts WHERE id IN (SELECT receipt_id FROM _del_receipt_je);
  DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT je_id FROM _del_receipt_je WHERE je_id IS NOT NULL);
  DELETE FROM journal_entries WHERE id IN (SELECT je_id FROM _del_receipt_je WHERE je_id IS NOT NULL);

  -- Step 3: break cycles + delete
  UPDATE journal_entries SET reversed_entry_id = NULL WHERE id IN (SELECT je_id FROM _del_je) AND reversed_entry_id IS NOT NULL;
  UPDATE journal_entries SET reversed_entry_id = NULL WHERE reversed_entry_id IN (SELECT je_id FROM _del_je) AND id NOT IN (SELECT je_id FROM _del_je);
  DELETE FROM school_ar_invoices WHERE ar_invoice_id IN (SELECT ar_id FROM _del_ar);
  DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT je_id FROM _del_je);
  DELETE FROM ar_invoices WHERE id IN (SELECT ar_id FROM _del_ar);
  DELETE FROM journal_entries WHERE id IN (SELECT je_id FROM _del_je);

  -- Step 4: zombie JEs
  DELETE FROM journal_entries je
  WHERE je.business_unit_code = 'SBO'
    AND je.entry_date BETWEEN '2026-04-01' AND '2026-04-30'
    AND je.total_debit = 0
    AND NOT EXISTS (SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id)
    AND NOT EXISTS (SELECT 1 FROM ar_invoices ai2 WHERE ai2.journal_entry_id = je.id)
    AND NOT EXISTS (SELECT 1 FROM ap_invoices api WHERE api.journal_entry_id = je.id)
    AND NOT EXISTS (SELECT 1 FROM ap_payments app WHERE app.journal_entry_id = je.id)
    AND NOT EXISTS (SELECT 1 FROM ar_receipts arr WHERE arr.journal_entry_id = je.id)
    AND NOT EXISTS (SELECT 1 FROM journal_entries je2 WHERE je2.reversed_entry_id = je.id);

  -- Step 5: Create batch row + regenerate Katunayaka
  INSERT INTO school_ar_invoice_batches(id, company_id, branch_id, batch_number, invoice_month, status)
  VALUES (v_batch_id, v_company_id, v_katu_branch,
          'SBS-BATCH-202604-LKA-' || to_char(now(),'YYYYMMDDHH24MISS'),
          '2026-04-21', 'posted');

  v_seq := 1780;
  FOR v_student IN
    SELECT s.id, s.student_name, s.fixed_monthly_amount
    FROM school_students s
    WHERE s.branch_id = v_katu_branch AND s.is_active = true
    ORDER BY s.student_name
  LOOP
    v_amount := ROUND(COALESCE(v_student.fixed_monthly_amount,0) * 0.80, 2);
    IF v_amount <= 0 THEN CONTINUE; END IF;

    v_invoice_no := 'SBS-INV-202604-' || lpad(v_seq::text, 5, '0');
    v_je_no := 'SBS-JE-202604-LKA' || lpad(v_seq::text, 5, '0');

    INSERT INTO journal_entries(entry_number, entry_date, description, status, total_debit, total_credit,
                                approval_status, company_id, business_unit_code, source_module)
    VALUES (v_je_no, '2026-04-21', 'School Bus AR - ' || v_student.student_name, 'posted',
            v_amount, v_amount, 'pending', v_company_id, 'SBO', 'school_bus_ar')
    RETURNING id INTO v_je_id;

    INSERT INTO journal_entry_lines(journal_entry_id, account_id, description, debit, credit, company_id, business_unit_code)
    VALUES
      (v_je_id, v_dr_account, 'AR - ' || v_student.student_name || ' (' || v_invoice_no || ')', v_amount, 0, v_company_id, 'SBO'),
      (v_je_id, v_cr_account, 'Collection - ' || v_student.student_name, 0, v_amount, v_company_id, 'SBO');

    INSERT INTO ar_invoices(invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount,
                            discount_amount, total_amount, paid_amount, balance, status,
                            journal_entry_id, company_id, business_unit_code)
    VALUES (v_invoice_no, v_katu_customer, '2026-04-21', '2026-05-21', v_amount, 0, 0,
            v_amount, 0, v_amount, 'posted', v_je_id, v_company_id, 'SBO')
    RETURNING id INTO v_ar_id;

    INSERT INTO school_ar_invoices(batch_id, student_id, ar_invoice_id, invoice_number, invoice_month,
                                   amount, status, paid_amount, journal_entry_id)
    VALUES (v_batch_id, v_student.id, v_ar_id, v_invoice_no, '2026-04-21', v_amount, 'posted', 0, v_je_id);

    INSERT INTO school_student_ar_link(student_id, customer_id) VALUES (v_student.id, v_katu_customer) ON CONFLICT DO NOTHING;

    v_batch_total := v_batch_total + v_amount;
    v_batch_count := v_batch_count + 1;
    v_seq := v_seq + 1;
  END LOOP;

  UPDATE school_ar_invoice_batches
  SET total_students = v_batch_count, total_invoices = v_batch_count, total_amount = v_batch_total, posted_at = now()
  WHERE id = v_batch_id;

  -- Step 6: COA recalc
  UPDATE chart_of_accounts coa SET current_balance = COALESCE((
    SELECT SUM(jel.debit) - SUM(jel.credit) FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = coa.id AND je.status = 'posted'
  ), 0) WHERE coa.id = v_dr_account;

  UPDATE chart_of_accounts coa SET current_balance = COALESCE((
    SELECT SUM(jel.credit) - SUM(jel.debit) FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = coa.id AND je.status = 'posted'
  ), 0) WHERE coa.id = v_cr_account;

  -- Step 7: Validation
  SELECT COUNT(*), COALESCE(SUM(ai.total_amount),0) INTO v_total_count, v_total_amount
  FROM ar_invoices ai
  JOIN school_ar_invoices sai ON sai.ar_invoice_id = ai.id
  WHERE ai.business_unit_code = 'SBO' AND ai.invoice_date BETWEEN '2026-04-01' AND '2026-04-30';

  RAISE NOTICE 'April SBO final: % invoices / Rs %  | Archive: %', v_total_count, v_total_amount, v_archive_schema;

  IF v_total_count <> 670 OR v_total_amount <> 4094760 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: got % / Rs % (expected 670 / 4094760)', v_total_count, v_total_amount;
  END IF;
END
$mig$;

CREATE OR REPLACE VIEW v_sbo_finance_validation AS
SELECT sb.branch_name, date_trunc('month', ai.invoice_date)::date AS invoice_month,
  COUNT(DISTINCT ai.id) AS ar_count,
  COUNT(DISTINCT ai.journal_entry_id) FILTER (WHERE ai.journal_entry_id IS NOT NULL) AS je_count,
  COUNT(DISTINCT sai.id) AS school_invoice_count,
  SUM(ai.total_amount) AS ar_total, SUM(ai.balance) AS ar_balance,
  CASE WHEN COUNT(DISTINCT ai.id) = COUNT(DISTINCT ai.journal_entry_id) FILTER (WHERE ai.journal_entry_id IS NOT NULL)
        AND COUNT(DISTINCT ai.id) = COUNT(DISTINCT sai.id) THEN 'OK' ELSE 'MISMATCH' END AS status
FROM ar_invoices ai
JOIN school_ar_invoices sai ON sai.ar_invoice_id = ai.id
JOIN school_students s ON s.id = sai.student_id
LEFT JOIN school_branches sb ON sb.id = s.branch_id
WHERE ai.business_unit_code = 'SBO'
GROUP BY sb.branch_name, date_trunc('month', ai.invoice_date);

CREATE OR REPLACE VIEW v_sbo_orphan_journal_entries AS
SELECT je.id, je.entry_number, je.entry_date, je.total_debit, je.total_credit, je.status
FROM journal_entries je
WHERE je.business_unit_code = 'SBO'
  AND NOT EXISTS (SELECT 1 FROM ar_invoices WHERE journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM ap_invoices WHERE journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM ap_payments WHERE journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM ar_receipts WHERE journal_entry_id = je.id);