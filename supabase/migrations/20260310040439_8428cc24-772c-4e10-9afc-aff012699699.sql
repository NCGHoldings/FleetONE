-- Fix incorrectly tagged School Bus records
UPDATE ar_invoices SET business_unit_code = 'SBO' WHERE invoice_number LIKE 'SBS-%' AND (business_unit_code != 'SBO' OR business_unit_code IS NULL);
UPDATE journal_entries SET business_unit_code = 'SBO' WHERE description LIKE 'School Bus%' AND (business_unit_code != 'SBO' OR business_unit_code IS NULL);
UPDATE customers SET business_unit_code = 'SBO' WHERE customer_code LIKE 'SBS-%' AND (business_unit_code != 'SBO' OR business_unit_code IS NULL);
UPDATE ar_receipts SET business_unit_code = 'SBO' WHERE notes LIKE 'School Bus%' AND (business_unit_code != 'SBO' OR business_unit_code IS NULL);