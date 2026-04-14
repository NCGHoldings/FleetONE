-- Add company_id column to verified existing core accounting tables

-- Core GL Tables
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company ON chart_of_accounts(company_id);

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);

ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_company ON journal_entry_lines(company_id);

-- Customer/Vendor Masters
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);

-- AR Tables
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_company ON ar_invoices(company_id);

ALTER TABLE ar_invoice_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_invoice_lines_company ON ar_invoice_lines(company_id);

ALTER TABLE ar_receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_receipts_company ON ar_receipts(company_id);

ALTER TABLE ar_receipt_allocations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_receipt_allocations_company ON ar_receipt_allocations(company_id);

ALTER TABLE ar_credit_notes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_credit_notes_company ON ar_credit_notes(company_id);

ALTER TABLE ar_reconciliations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_reconciliations_company ON ar_reconciliations(company_id);

ALTER TABLE ar_bad_debt_provisions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ar_bad_debt_provisions_company ON ar_bad_debt_provisions(company_id);

-- AP Tables
ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_company ON ap_invoices(company_id);

ALTER TABLE ap_invoice_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ap_invoice_lines_company ON ap_invoice_lines(company_id);

ALTER TABLE ap_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_company ON ap_payments(company_id);

ALTER TABLE ap_payment_allocations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ap_payment_allocations_company ON ap_payment_allocations(company_id);

ALTER TABLE ap_debit_notes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ap_debit_notes_company ON ap_debit_notes(company_id);

ALTER TABLE ap_reconciliations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_ap_reconciliations_company ON ap_reconciliations(company_id);

-- Banking Tables
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);

ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON bank_transactions(company_id);

ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_company ON bank_reconciliations(company_id);

ALTER TABLE bank_reconciliation_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_items_company ON bank_reconciliation_items(company_id);

ALTER TABLE bank_statement_imports ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_bank_statement_imports_company ON bank_statement_imports(company_id);

-- Fixed Assets Tables
ALTER TABLE fixed_assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);

ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_company ON asset_categories(company_id);

ALTER TABLE asset_depreciation_schedule ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_schedule_company ON asset_depreciation_schedule(company_id);

ALTER TABLE asset_disposals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_company ON asset_disposals(company_id);

ALTER TABLE asset_revaluations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_asset_revaluations_company ON asset_revaluations(company_id);

ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_company ON asset_transfers(company_id);

-- Procurement Tables
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_company ON purchase_requisitions(company_id);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);

ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_company ON purchase_order_lines(company_id);

ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_notes_company ON goods_receipt_notes(company_id);

ALTER TABLE goods_receipt_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_company ON goods_receipt_lines(company_id);

ALTER TABLE grn_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_grn_lines_company ON grn_lines(company_id);

-- Inventory Tables
ALTER TABLE items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);

ALTER TABLE item_stock ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_item_stock_company ON item_stock(company_id);

ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_company ON stock_adjustments(company_id);

ALTER TABLE batch_numbers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_company ON batch_numbers(company_id);

-- Financial Control Tables
ALTER TABLE financial_periods ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_company ON financial_periods(company_id);

ALTER TABLE wht_certificates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_wht_certificates_company ON wht_certificates(company_id);

ALTER TABLE sscl_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_sscl_transactions_company ON sscl_transactions(company_id);

-- Budget Tables
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_budgets_company ON budgets(company_id);

ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_company ON budget_line_items(company_id);

ALTER TABLE budget_departments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_budget_departments_company ON budget_departments(company_id);

-- Other Accounting Tables
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);

ALTER TABLE cashbook_entries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_cashbook_entries_company ON cashbook_entries(company_id);

ALTER TABLE cheque_register ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_cheque_register_company ON cheque_register(company_id);

ALTER TABLE fund_transfers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_company ON fund_transfers(company_id);

ALTER TABLE cogs_transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_cogs_transactions_company ON cogs_transactions(company_id);

ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON exchange_rates(company_id);

ALTER TABLE currencies ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_currencies_company ON currencies(company_id);

ALTER TABLE coa_upload_history ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_coa_upload_history_company ON coa_upload_history(company_id);

ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON accounts_payable(company_id);

ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company ON accounts_receivable(company_id);

ALTER TABLE journal_entry_approvals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_approvals_company ON journal_entry_approvals(company_id);

ALTER TABLE document_approvals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_company ON document_approvals(company_id);

ALTER TABLE approval_configurations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_approval_configurations_company ON approval_configurations(company_id);