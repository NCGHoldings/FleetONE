-- Add email tracking columns to document_storage table
ALTER TABLE document_storage 
ADD COLUMN IF NOT EXISTS ready_to_send BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_status TEXT CHECK (email_status IN ('not_sent', 'sent', 'no_email', 'failed')) DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sent_by UUID REFERENCES auth.users(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_storage_email_status ON document_storage(email_status);
CREATE INDEX IF NOT EXISTS idx_document_storage_ready_to_send ON document_storage(ready_to_send);
CREATE INDEX IF NOT EXISTS idx_document_storage_quotation_id ON document_storage(quotation_id);