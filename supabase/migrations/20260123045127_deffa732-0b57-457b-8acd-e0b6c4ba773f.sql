-- Add business_unit_code to ar_invoices (was missing)
ALTER TABLE ar_invoices 
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ar_invoices_business_unit ON ar_invoices(business_unit_code);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_business_unit ON ap_invoices(business_unit_code);
CREATE INDEX IF NOT EXISTS idx_customers_business_unit ON customers(business_unit_code);
CREATE INDEX IF NOT EXISTS idx_vendors_business_unit ON vendors(business_unit_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_unit ON journal_entries(business_unit_code);

-- Tag existing SBS AR invoices with business_unit_code
UPDATE ar_invoices
SET business_unit_code = 'SBO'
WHERE invoice_number LIKE 'SBS-%'
  AND (business_unit_code IS NULL OR business_unit_code = '');

-- Tag existing SBS customers with business_unit_code
UPDATE customers
SET business_unit_code = 'SBO'
WHERE customer_code LIKE 'SBS-%'
  AND (business_unit_code IS NULL OR business_unit_code = '');