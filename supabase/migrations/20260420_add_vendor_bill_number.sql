-- ============================================
-- Add vendor_bill_number to ap_invoices table
-- The vendor's own invoice/bill reference number
-- ============================================

ALTER TABLE ap_invoices 
ADD COLUMN IF NOT EXISTS vendor_bill_number TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN ap_invoices.vendor_bill_number IS 'The vendor''s own invoice/bill number (from their document)';

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ap_invoices' AND column_name = 'vendor_bill_number';
