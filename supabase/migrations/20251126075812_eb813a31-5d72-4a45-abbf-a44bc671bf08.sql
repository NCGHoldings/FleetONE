-- Add odometer tracking columns to buses table
ALTER TABLE buses 
ADD COLUMN IF NOT EXISTS base_odometer_km NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS base_odometer_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS odometer_source TEXT DEFAULT 'manual';

COMMENT ON COLUMN buses.base_odometer_km IS 'Manually set base odometer reading for GPS-based calculation';
COMMENT ON COLUMN buses.base_odometer_date IS 'Date when base odometer was recorded';
COMMENT ON COLUMN buses.odometer_source IS 'Source of odometer data: fios, manual, or gps_calculated';

-- Create daily mileage tracking table
CREATE TABLE IF NOT EXISTS bus_daily_mileage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_odometer_km NUMERIC,
  end_odometer_km NUMERIC,
  daily_km NUMERIC,
  data_source TEXT DEFAULT 'gps_calculated',
  is_adjusted BOOLEAN DEFAULT FALSE,
  adjustment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bus_id, date)
);

COMMENT ON TABLE bus_daily_mileage IS 'Tracks daily mileage for each bus using Sri Lanka timezone';
COMMENT ON COLUMN bus_daily_mileage.data_source IS 'Source: fios, manual, or gps_calculated';

-- Enable RLS
ALTER TABLE bus_daily_mileage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bus_daily_mileage
CREATE POLICY "Allow authenticated users to view daily mileage"
  ON bus_daily_mileage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow super_admin and admin to insert daily mileage"
  ON bus_daily_mileage FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Allow super_admin and admin to update daily mileage"
  ON bus_daily_mileage FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_bus_daily_mileage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER bus_daily_mileage_updated_at
  BEFORE UPDATE ON bus_daily_mileage
  FOR EACH ROW
  EXECUTE FUNCTION update_bus_daily_mileage_updated_at();