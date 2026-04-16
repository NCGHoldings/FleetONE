-- Add journal_entry_id column to school_ar_invoices for individual tracking
ALTER TABLE school_ar_invoices 
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_school_ar_invoices_journal_entry 
ON school_ar_invoices(journal_entry_id);

-- Add comment for documentation
COMMENT ON COLUMN school_ar_invoices.journal_entry_id IS 'Links individual school invoice to its specific journal entry in the GL';