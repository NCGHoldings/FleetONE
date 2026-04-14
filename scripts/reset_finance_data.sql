-- ============================================================
-- 🔄 FINANCE DATA RESET SQL (SAFE VERSION)
-- Skips tables that don't exist — no errors
-- ============================================================
SET session_replication_role = 'replica';
DO $$
DECLARE tbl TEXT;
tables_to_clear TEXT [] := ARRAY [
    -- Child/dependent tables first
    'journal_entry_lines',
    'ar_receipt_allocations',
    'ar_invoice_lines',
    'ar_credit_notes',
    'ar_bad_debt_provisions',
    'ap_payment_allocations',
    'ap_invoice_lines',
    'ap_debit_notes',
    'bank_reconciliation_items',
    'asset_depreciation_schedule',
    'asset_disposals',
    'asset_maintenance_logs',
    'batch_numbers',
    'serial_numbers',
    'item_stock',
    'stock_adjustments',
    -- Parent tables
    'journal_entries',
    'recurring_journal_entries',
    'ar_receipts',
    'ar_invoices',
    'ap_payments',
    'ap_invoices',
    'bank_reconciliations',
    'bank_transactions',
    'cheque_register',
    'fund_transfers',
    'bank_accounts',
    'fixed_assets',
    'goods_receipt_notes',
    'purchase_orders',
    'purchase_requisitions',
    'sales_orders',
    'items',
    'customers',
    'vendors',
    'vendor_performance',
    'wht_certificates',
    'exchange_rates',
    'payment_entries',
    'accounting_audit_log',
    'budget_line_items',
    'budgets',
    'expense_requests'
  ];
BEGIN FOREACH tbl IN ARRAY tables_to_clear LOOP IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = tbl
) THEN EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl);
RAISE NOTICE '✅ Cleared: %',
tbl;
ELSE RAISE NOTICE '⏭️  Skipped (does not exist): %',
tbl;
END IF;
END LOOP;
-- Reset COA balances to zero (keep accounts)
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'chart_of_accounts'
) THEN
UPDATE chart_of_accounts
SET current_balance = 0,
    opening_balance = 0
WHERE current_balance != 0
    OR opening_balance != 0;
RAISE NOTICE '✅ COA balances reset to 0';
END IF;
END $$;
SET session_replication_role = 'origin';
-- Verify: list all finance-related tables and their row counts
SELECT table_name,
    (xpath('/row/cnt/text()', xml_count)) [1]::text::int as row_count
FROM (
        SELECT table_name,
            query_to_xml(
                format('SELECT COUNT(*) as cnt FROM %I', table_name),
                false,
                true,
                ''
            ) as xml_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name IN (
                'customers',
                'vendors',
                'ar_invoices',
                'ap_invoices',
                'journal_entries',
                'bank_accounts',
                'bank_transactions',
                'items'
            )
    ) t
ORDER BY table_name;