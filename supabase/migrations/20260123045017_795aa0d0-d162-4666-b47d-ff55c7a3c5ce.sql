-- Add business_unit_code columns to tables that need them

-- Add to customers if not exists
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Add to vendors if not exists
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Add to ap_invoices if not exists
ALTER TABLE ap_invoices 
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Add to ar_receipts if not exists
ALTER TABLE ar_receipts 
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Add to ap_payments if not exists
ALTER TABLE ap_payments 
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;