SELECT
  (SELECT COUNT(*) FROM ap_invoices WHERE created_at > '2026-04-30 19:30:00+00') as ap_invoices_count,
  (SELECT COUNT(*) FROM ar_invoices WHERE created_at > '2026-04-30 19:30:00+00') as ar_invoices_count,
  (SELECT COUNT(*) FROM ap_payments WHERE created_at > '2026-04-30 19:30:00+00') as ap_payments_count,
  (SELECT COUNT(*) FROM ar_receipts WHERE created_at > '2026-04-30 19:30:00+00') as ar_receipts_count,
  (SELECT COUNT(*) FROM journal_entries WHERE created_at > '2026-04-30 19:30:00+00') as journal_entries_count,
  (SELECT COUNT(*) FROM special_hire_payments WHERE created_at > '2026-04-30 19:30:00+00') as sh_payments_count;
