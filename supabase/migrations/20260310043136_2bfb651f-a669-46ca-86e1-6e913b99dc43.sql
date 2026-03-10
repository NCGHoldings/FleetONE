
-- Add bus tracking columns to ar_invoices
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS bus_id uuid REFERENCES buses(id) ON DELETE SET NULL;
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS bus_no text;
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS bus_type text;
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS bus_category_id uuid REFERENCES bus_categories(id) ON DELETE SET NULL;
ALTER TABLE ar_invoices ADD COLUMN IF NOT EXISTS bus_sub_category_id uuid REFERENCES bus_sub_categories(id) ON DELETE SET NULL;

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_ar_invoices_bus_id ON ar_invoices(bus_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_bus_category_id ON ar_invoices(bus_category_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_bus_no ON ar_invoices(bus_no);
