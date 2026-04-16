-- Create multi_day_route_config table for managing long-distance routes
CREATE TABLE multi_day_route_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_pattern TEXT, -- e.g., "Moratuwa-Jaffna", "Jaffna-Moratuwa"
  is_enabled BOOLEAN DEFAULT true,
  typical_days_per_trip INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_multi_day_route_config_route_id ON multi_day_route_config(route_id);
CREATE INDEX idx_multi_day_route_config_enabled ON multi_day_route_config(is_enabled);

-- Enable RLS
ALTER TABLE multi_day_route_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for authenticated users"
  ON multi_day_route_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for super_admin and admin"
  ON multi_day_route_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Enable update for super_admin and admin"
  ON multi_day_route_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Enable delete for super_admin and admin"
  ON multi_day_route_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_multi_day_route_config_updated_at
  BEFORE UPDATE ON multi_day_route_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();