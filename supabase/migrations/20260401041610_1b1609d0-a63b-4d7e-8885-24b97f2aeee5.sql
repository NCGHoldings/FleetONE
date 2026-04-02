
-- Fix school bus finance settings
UPDATE school_bus_finance_settings 
SET advance_payments_liability_account_id = '8c6b8e22-596b-4e90-bd63-d09e88159f3f'::uuid
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06';

-- Create correcting journal entry
INSERT INTO journal_entries (
  company_id, entry_date, description, reference, status, source_module, business_unit_code, total_debit, total_credit
) VALUES (
  'f40b0a9d-ae5b-41b3-9188-535ae94c9020'::uuid,
  CURRENT_DATE,
  'Correcting Entry: Reclassify student overpayment from Income Tax Payable to Customer Advances',
  'CORR-SBO-001',
  'posted',
  'school_bus',
  'SBO',
  700,
  700
);

-- Insert correcting journal entry lines
WITH je AS (
  SELECT id FROM journal_entries 
  WHERE reference = 'CORR-SBO-001' 
  AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'::uuid
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, company_id, business_unit_code)
SELECT je.id, 'f59ffc4d-8721-41a8-978b-506cc906d913'::uuid, 700, 0, 'Reclassify: Remove overpayment from Income Tax Payable', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'::uuid, 'SBO' FROM je
UNION ALL
SELECT je.id, '8c6b8e22-596b-4e90-bd63-d09e88159f3f'::uuid, 0, 700, 'Reclassify: Student overpayment to Customer Advances', 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'::uuid, 'SBO' FROM je;
