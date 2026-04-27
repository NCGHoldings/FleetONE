SELECT tgname, relname
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE relname IN ('ar_receipts', 'ar_receipt_allocations', 'school_payment_transactions', 'ar_invoices');
