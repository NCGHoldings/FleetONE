-- Add invoice_status column to document_storage
ALTER TABLE document_storage 
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'draft';

COMMENT ON COLUMN document_storage.invoice_status IS 'Status of invoice: draft, sent_to_customer, payment_pending, paid';

-- Add balance_invoice_document_id to special_hire_trip_adjustments
ALTER TABLE special_hire_trip_adjustments
ADD COLUMN IF NOT EXISTS balance_invoice_document_id UUID REFERENCES document_storage(id);

COMMENT ON COLUMN special_hire_trip_adjustments.balance_invoice_document_id IS 'Links trip adjustment to the balance invoice document';