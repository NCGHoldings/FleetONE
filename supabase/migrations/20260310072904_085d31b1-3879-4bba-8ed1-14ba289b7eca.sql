-- Add route_id, bus_id, school_route_id columns to ap_invoices
ALTER TABLE ap_invoices 
  ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES routes(id),
  ADD COLUMN IF NOT EXISTS bus_id uuid REFERENCES buses(id),
  ADD COLUMN IF NOT EXISTS school_route_id uuid REFERENCES school_routes(id);

CREATE INDEX IF NOT EXISTS idx_ap_invoices_route_id ON ap_invoices(route_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_bus_id ON ap_invoices(bus_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoices_school_route_id ON ap_invoices(school_route_id);