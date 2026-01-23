-- Move School Bus Operations journal entries to NCG Holding consolidated GL
-- Only update entries that were created under School Bus Operations company
UPDATE journal_entries
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020',  -- NCG Holding
  business_unit_code = COALESCE(business_unit_code, 'SBO'),
  business_unit_id = COALESCE(business_unit_id, '0fba4a2f-598b-47e8-b863-283d00380b06')  -- School Bus Operations
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'  -- School Bus Operations
  AND (entry_number LIKE 'SBS-%' OR entry_number LIKE 'SBO-%');

-- Update journal entry lines to NCG Holding
UPDATE journal_entry_lines
SET company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'  -- NCG Holding
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'  -- School Bus Operations
  AND journal_entry_id IN (
    SELECT id FROM journal_entries 
    WHERE business_unit_code = 'SBO' OR business_unit_id = '0fba4a2f-598b-47e8-b863-283d00380b06'
  );

-- Update AR invoices created from School Bus to NCG Holding
UPDATE ar_invoices
SET company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'  -- NCG Holding
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'  -- School Bus Operations
  AND invoice_number LIKE 'SBS-BATCH-%';

-- Update customers created for School Bus to NCG Holding
UPDATE customers
SET company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'  -- NCG Holding
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'  -- School Bus Operations
  AND customer_code LIKE 'SBS-%';