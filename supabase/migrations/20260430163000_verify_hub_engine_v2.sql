-- Enterprise Global Verify Hub Engine V2
-- Expansion for IOU, Petty Cash, and Special Hire Payments

-- 1. IOUs missing GL
CREATE OR REPLACE VIEW vh_alert_iou_records AS
SELECT 
    'iou_record' as module,
    id as record_id,
    iou_number as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.iou_records
WHERE status = 'Issued'
AND journal_entry_id IS NULL;

-- 2. Special Hire Payments missing GL
CREATE OR REPLACE VIEW vh_alert_special_hire_payments AS
SELECT 
    'special_hire_payment' as module,
    id as record_id,
    reference_no as reference,
    'Missing Journal Entry' as issue_type,
    'high' as severity,
    created_at
FROM public.special_hire_payments
WHERE status = 'approved'
AND journal_entry_id IS NULL;

-- 3. Global Alerts Master View (UNION ALL checks)
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
ORDER BY created_at DESC;

-- 4. Verification Pipeline Stats View
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
    (SELECT COUNT(*) FROM vh_alert_special_hire_payments) as alert_count;
