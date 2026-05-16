ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS agent_reference TEXT;
ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS agent_reference TEXT;
