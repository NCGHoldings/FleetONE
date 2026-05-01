-- Enterprise Global Verify Hub Engine
-- High-speed views for instant anomaly detection and pipeline monitoring

-- 1. AP Payments missing GL
CREATE OR REPLACE VIEW vh_alert_ap_payments AS
SELECT 
    'ap_payment' as module,
    id as record_id,
    payment_number as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.ap_payments
WHERE amount > 0 
AND journal_entry_id IS NULL 
AND status != 'voided';

-- 2. AR Receipts missing GL
CREATE OR REPLACE VIEW vh_alert_ar_receipts AS
SELECT 
    'ar_receipt' as module,
    id as record_id,
    receipt_number as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.ar_receipts
WHERE amount > 0 
AND journal_entry_id IS NULL 
AND status != 'voided';

-- 3. Journal Entries that do not balance
CREATE OR REPLACE VIEW vh_alert_unbalanced_je AS
SELECT 
    'journal_entry' as module,
    id as record_id,
    entry_number as reference,
    'Unbalanced Debit/Credit' as issue_type,
    'critical' as severity,
    created_at
FROM public.journal_entries
WHERE total_debit != total_credit
AND status = 'posted';

-- 4. Global Alerts Master View (UNION of all checks)
CREATE OR REPLACE VIEW vh_system_alerts AS
SELECT * FROM vh_alert_ap_payments
UNION ALL
SELECT * FROM vh_alert_ar_receipts
UNION ALL
SELECT * FROM vh_alert_unbalanced_je
ORDER BY created_at DESC;

-- 5. Verification Pipeline Stats View
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
    (SELECT COUNT(*) FROM vh_alert_unbalanced_je) as alert_count;
