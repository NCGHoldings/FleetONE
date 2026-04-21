DROP VIEW IF EXISTS v_sbo_finance_validation;
DROP VIEW IF EXISTS v_sbo_orphan_journal_entries;

CREATE VIEW v_sbo_finance_validation WITH (security_invoker = true) AS
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

CREATE VIEW v_sbo_orphan_journal_entries WITH (security_invoker = true) AS
SELECT je.id, je.entry_number, je.entry_date, je.total_debit, je.total_credit, je.status
FROM journal_entries je
WHERE je.business_unit_code = 'SBO'
  AND NOT EXISTS (SELECT 1 FROM ar_invoices WHERE journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM ap_invoices WHERE journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM ap_payments WHERE journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM ar_receipts WHERE journal_entry_id = je.id);