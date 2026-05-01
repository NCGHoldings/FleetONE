-- Enterprise Global Verify Hub Engine V3
-- Expansion for AR Invoices, AP Invoices, and Petty Cash Transactions

-- 1. AR Invoices missing GL
CREATE OR REPLACE VIEW vh_alert_ar_invoices AS
SELECT 
    'ar_invoices' as module,
    id as record_id,
    invoice_number as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.ar_invoices
WHERE total_amount > 0 
AND status != 'draft' 
AND journal_entry_id IS NULL;

-- 2. AP Invoices missing GL
CREATE OR REPLACE VIEW vh_alert_ap_invoices AS
SELECT 
    'ap_invoices' as module,
    id as record_id,
    invoice_number as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.ap_invoices
WHERE total_amount > 0 
AND status != 'draft' 
AND journal_entry_id IS NULL;

-- 3. Petty Cash Transactions missing GL
CREATE OR REPLACE VIEW vh_alert_petty_cash_transactions AS
SELECT 
    'petty_cash_transactions' as module,
    id as record_id,
    COALESCE(receipt_number, voucher_number, id::text) as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.petty_cash_transactions
WHERE amount > 0 
AND status != 'draft'
AND journal_entry_id IS NULL;

-- 4. Queue System Failures (Zero-Downtime Pipeline)
CREATE OR REPLACE VIEW vh_alert_queue_failures AS
SELECT 
    'system_event_queue' as module,
    id as record_id,
    event_type as reference,
    'Background Queue Failed: ' || COALESCE(error_log, 'Unknown Error') as issue_type,
    'critical' as severity,
    created_at
FROM public.system_event_queue
WHERE status = 'failed';

-- 5. Global Alerts Master View (UNION ALL checks)
DROP VIEW IF EXISTS vh_system_alerts;
CREATE OR REPLACE VIEW vh_system_alerts AS
SELECT * FROM vh_alert_ap_payments
UNION ALL
SELECT * FROM vh_alert_ar_receipts
UNION ALL
SELECT * FROM vh_alert_unbalanced_je
UNION ALL
SELECT * FROM vh_alert_iou_records
UNION ALL
SELECT * FROM vh_alert_special_hire_payments
UNION ALL
SELECT * FROM vh_alert_ar_invoices
UNION ALL
SELECT * FROM vh_alert_ap_invoices
UNION ALL
SELECT * FROM vh_alert_petty_cash_transactions
UNION ALL
SELECT * FROM vh_alert_queue_failures
ORDER BY created_at DESC;

-- 6. Verification Pipeline Stats View
DROP VIEW IF EXISTS vh_pipeline_stats;
CREATE OR REPLACE VIEW vh_pipeline_stats AS
SELECT 
    'ap_payments' as pipeline_name,
    (SELECT COUNT(*) FROM ap_payments) as total_count,
    (SELECT COUNT(*) FROM ap_payments WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_ap_payments) as alert_count
UNION ALL
SELECT 
    'ar_receipts' as pipeline_name,
    (SELECT COUNT(*) FROM ar_receipts) as total_count,
    (SELECT COUNT(*) FROM ar_receipts WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_ar_receipts) as alert_count
UNION ALL
SELECT 
    'journal_entries' as pipeline_name,
    (SELECT COUNT(*) FROM journal_entries) as total_count,
    (SELECT COUNT(*) FROM journal_entries WHERE total_debit = total_credit) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_unbalanced_je) as alert_count
UNION ALL
SELECT 
    'iou_records' as pipeline_name,
    (SELECT COUNT(*) FROM iou_records) as total_count,
    (SELECT COUNT(*) FROM iou_records WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_iou_records) as alert_count
UNION ALL
SELECT 
    'special_hire_payments' as pipeline_name,
    (SELECT COUNT(*) FROM special_hire_payments) as total_count,
    (SELECT COUNT(*) FROM special_hire_payments WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_special_hire_payments) as alert_count
UNION ALL
SELECT 
    'ar_invoices' as pipeline_name,
    (SELECT COUNT(*) FROM ar_invoices) as total_count,
    (SELECT COUNT(*) FROM ar_invoices WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_ar_invoices) as alert_count
UNION ALL
SELECT 
    'ap_invoices' as pipeline_name,
    (SELECT COUNT(*) FROM ap_invoices) as total_count,
    (SELECT COUNT(*) FROM ap_invoices WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_ap_invoices) as alert_count
UNION ALL
SELECT 
    'petty_cash_transactions' as pipeline_name,
    (SELECT COUNT(*) FROM petty_cash_transactions) as total_count,
    (SELECT COUNT(*) FROM petty_cash_transactions WHERE journal_entry_id IS NOT NULL) as verified_count,
    (SELECT COUNT(*) FROM vh_alert_petty_cash_transactions) as alert_count
UNION ALL
SELECT 
    'system_event_queue' as pipeline_name,
    (SELECT COUNT(*) FROM system_event_queue) as total_count,
    (SELECT COUNT(*) FROM system_event_queue WHERE status = 'completed') as verified_count,
    (SELECT COUNT(*) FROM vh_alert_queue_failures) as alert_count;
