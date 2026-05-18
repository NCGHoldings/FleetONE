-- Add agent_reference column to AP and AR invoices
ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS agent_reference TEXT;
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS agent_reference TEXT;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
