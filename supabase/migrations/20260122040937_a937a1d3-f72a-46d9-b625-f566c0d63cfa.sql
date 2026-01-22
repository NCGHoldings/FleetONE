-- Step 1: Create NCG Holding as the parent company
INSERT INTO companies (id, name, short_code, business_unit_type, is_active, parent_company_id)
VALUES (gen_random_uuid(), 'NCG Holding', 'NCG', 'holding', true, NULL);

-- Step 2: Update existing companies with business_unit_type and parent
UPDATE companies 
SET business_unit_type = 'school_bus', 
    parent_company_id = (SELECT id FROM companies WHERE short_code = 'NCG' LIMIT 1)
WHERE name = 'NAS';

UPDATE companies 
SET business_unit_type = 'special_hire', 
    parent_company_id = (SELECT id FROM companies WHERE short_code = 'NCG' LIMIT 1)
WHERE name = 'NSP';

UPDATE companies 
SET business_unit_type = 'yutong', 
    parent_company_id = (SELECT id FROM companies WHERE short_code = 'NCG' LIMIT 1)
WHERE name = 'NEX';

-- Step 3: Assign all existing customers to NAS (the default company)
UPDATE customers 
SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742'
WHERE company_id IS NULL;

-- Step 4: Assign all existing vendors to NAS
UPDATE vendors 
SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742'
WHERE company_id IS NULL;

-- Step 5: Assign all other accounting data to NAS
UPDATE chart_of_accounts SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE journal_entries SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE journal_entry_lines SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_invoices SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_invoice_lines SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_receipts SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_receipt_allocations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_credit_notes SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_bad_debt_provisions SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ar_reconciliations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ap_invoices SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ap_invoice_lines SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ap_payments SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ap_payment_allocations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ap_debit_notes SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE ap_reconciliations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE bank_accounts SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE bank_transactions SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE bank_reconciliations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE bank_reconciliation_items SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE bank_statement_imports SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE fixed_assets SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE asset_categories SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE asset_depreciation_schedule SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE asset_disposals SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE asset_revaluations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE asset_transfers SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE budgets SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE budget_line_items SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE budget_departments SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE cost_centers SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE profit_centers SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE financial_periods SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE currencies SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE exchange_rates SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE cashbook_entries SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE cheque_register SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE fund_transfers SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE purchase_orders SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE purchase_order_lines SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE purchase_requisitions SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE goods_receipt_notes SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE goods_receipt_lines SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE grn_lines SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE items SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE item_stock SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE stock_adjustments SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE batch_numbers SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE wht_certificates SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE approval_workflows SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE approval_configurations SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE auto_posting_rules SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE document_templates SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;
UPDATE sbus SET company_id = 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742' WHERE company_id IS NULL;