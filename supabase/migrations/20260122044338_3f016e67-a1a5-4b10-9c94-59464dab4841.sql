-- =====================================================
-- RESTRUCTURE COMPANY HIERARCHY (COMPLETE)
-- NCG Holding with 5 sub-companies + NCG Express
-- =====================================================

-- Step 1: Create new sub-companies under NCG Holding
INSERT INTO companies (name, short_code, parent_company_id, business_unit_type, is_active)
VALUES 
  ('School Bus Operations', 'SBO', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020', 'school_bus', true),
  ('Yutong Sales', 'YUT', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020', 'yutong', true),
  ('Special Hire', 'SPH', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020', 'special_hire', true),
  ('Light Vehicle Sales', 'LTV', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020', 'light_vehicle', true),
  ('Sinotruck Sales', 'SNT', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020', 'sinotruck', true);

-- Step 2: Create NCG Express as separate parent company
INSERT INTO companies (name, short_code, parent_company_id, business_unit_type, is_active)
VALUES ('NCG Express', 'NCGE', NULL, 'holding', true);

-- Step 3: Migrate ALL data from old companies to new ones
DO $$
DECLARE
  old_nas_id UUID := 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742';
  old_nsp_id UUID := 'f4dc9da4-b8d4-486a-82fb-c0bdc14ebeab';
  old_nex_id UUID := 'b2ea21cf-3a34-467f-8823-2557906f3dda';
  new_sbo_id UUID;
  new_sph_id UUID;
  new_yut_id UUID;
BEGIN
  SELECT id INTO new_sbo_id FROM companies WHERE short_code = 'SBO';
  SELECT id INTO new_sph_id FROM companies WHERE short_code = 'SPH';
  SELECT id INTO new_yut_id FROM companies WHERE short_code = 'YUT';
  
  -- ===== MIGRATE NAS -> SCHOOL BUS OPERATIONS (ALL 73 TABLES) =====
  UPDATE document_approvals SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE sbus SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE governance_items SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE user_company_access SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE blocked_periods SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE chart_of_accounts SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE journal_entries SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE journal_entry_lines SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE accounts_payable SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE accounts_receivable SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE financial_periods SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE budgets SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE budget_departments SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE budget_line_items SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE marketing_projects SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE marketing_job_requests SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE marketing_tasks SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE marketing_social_accounts SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE coa_upload_history SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE journal_entry_approvals SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE customers SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_invoices SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_invoice_lines SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_receipts SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_receipt_allocations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_credit_notes SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE vendors SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ap_invoices SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ap_invoice_lines SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ap_payments SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ap_payment_allocations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ap_debit_notes SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE bank_accounts SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE bank_transactions SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE bank_reconciliations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE cheque_register SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE fund_transfers SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE asset_categories SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE fixed_assets SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE asset_depreciation_schedule SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE asset_transfers SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE asset_revaluations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE items SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE item_stock SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE stock_adjustments SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE purchase_requisitions SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE purchase_orders SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE goods_receipt_notes SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE grn_lines SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE cost_centers SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE profit_centers SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE sscl_transactions SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE auto_posting_rules SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE accounting_audit_log SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE approval_workflows SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE accounting_activity_log SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_bad_debt_provisions SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE purchase_order_lines SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE goods_receipt_lines SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE currencies SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE exchange_rates SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE cashbook_entries SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE batch_numbers SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE wht_certificates SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE asset_disposals SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE cogs_transactions SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE bank_reconciliation_items SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE bank_statement_imports SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE approval_configurations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ar_reconciliations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE ap_reconciliations SET company_id = new_sbo_id WHERE company_id = old_nas_id;
  UPDATE document_templates SET company_id = new_sbo_id WHERE company_id = old_nas_id;

  -- ===== MIGRATE NSP -> SPECIAL HIRE (ALL TABLES) =====
  UPDATE document_approvals SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE sbus SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE governance_items SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE user_company_access SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE blocked_periods SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE chart_of_accounts SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE journal_entries SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE journal_entry_lines SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE accounts_payable SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE accounts_receivable SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE financial_periods SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE budgets SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE budget_departments SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE budget_line_items SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE marketing_projects SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE marketing_job_requests SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE marketing_tasks SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE marketing_social_accounts SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE coa_upload_history SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE journal_entry_approvals SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE customers SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_invoices SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_invoice_lines SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_receipts SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_receipt_allocations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_credit_notes SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE vendors SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ap_invoices SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ap_invoice_lines SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ap_payments SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ap_payment_allocations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ap_debit_notes SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE bank_accounts SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE bank_transactions SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE bank_reconciliations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE cheque_register SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE fund_transfers SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE asset_categories SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE fixed_assets SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE asset_depreciation_schedule SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE asset_transfers SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE asset_revaluations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE items SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE item_stock SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE stock_adjustments SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE purchase_requisitions SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE purchase_orders SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE goods_receipt_notes SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE grn_lines SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE cost_centers SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE profit_centers SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE sscl_transactions SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE auto_posting_rules SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE accounting_audit_log SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE approval_workflows SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE accounting_activity_log SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_bad_debt_provisions SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE purchase_order_lines SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE goods_receipt_lines SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE currencies SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE exchange_rates SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE cashbook_entries SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE batch_numbers SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE wht_certificates SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE asset_disposals SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE cogs_transactions SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE bank_reconciliation_items SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE bank_statement_imports SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE approval_configurations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ar_reconciliations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE ap_reconciliations SET company_id = new_sph_id WHERE company_id = old_nsp_id;
  UPDATE document_templates SET company_id = new_sph_id WHERE company_id = old_nsp_id;

  -- ===== MIGRATE NEX -> YUTONG SALES (ALL TABLES) =====
  UPDATE document_approvals SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE sbus SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE governance_items SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE user_company_access SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE blocked_periods SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE chart_of_accounts SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE journal_entries SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE journal_entry_lines SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE accounts_payable SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE accounts_receivable SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE financial_periods SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE budgets SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE budget_departments SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE budget_line_items SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE marketing_projects SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE marketing_job_requests SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE marketing_tasks SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE marketing_social_accounts SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE coa_upload_history SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE journal_entry_approvals SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE customers SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_invoices SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_invoice_lines SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_receipts SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_receipt_allocations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_credit_notes SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE vendors SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ap_invoices SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ap_invoice_lines SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ap_payments SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ap_payment_allocations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ap_debit_notes SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE bank_accounts SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE bank_transactions SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE bank_reconciliations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE cheque_register SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE fund_transfers SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE asset_categories SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE fixed_assets SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE asset_depreciation_schedule SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE asset_transfers SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE asset_revaluations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE items SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE item_stock SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE stock_adjustments SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE purchase_requisitions SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE purchase_orders SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE goods_receipt_notes SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE grn_lines SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE cost_centers SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE profit_centers SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE sscl_transactions SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE auto_posting_rules SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE accounting_audit_log SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE approval_workflows SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE accounting_activity_log SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_bad_debt_provisions SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE purchase_order_lines SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE goods_receipt_lines SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE currencies SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE exchange_rates SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE cashbook_entries SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE batch_numbers SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE wht_certificates SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE asset_disposals SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE cogs_transactions SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE bank_reconciliation_items SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE bank_statement_imports SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE approval_configurations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ar_reconciliations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE ap_reconciliations SET company_id = new_yut_id WHERE company_id = old_nex_id;
  UPDATE document_templates SET company_id = new_yut_id WHERE company_id = old_nex_id;
END $$;

-- Step 4: Delete old placeholder companies (NAS, NSP, NEX)
DELETE FROM companies WHERE id IN (
  'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742',
  'f4dc9da4-b8d4-486a-82fb-c0bdc14ebeab',
  'b2ea21cf-3a34-467f-8823-2557906f3dda'
);