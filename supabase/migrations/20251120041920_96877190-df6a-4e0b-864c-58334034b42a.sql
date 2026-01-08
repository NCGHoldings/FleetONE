-- Expand sinotruck_truck_models table with detailed specifications
ALTER TABLE sinotruck_truck_models
ADD COLUMN IF NOT EXISTS body_type TEXT DEFAULT 'Cargo',
ADD COLUMN IF NOT EXISTS drive_configuration TEXT,
ADD COLUMN IF NOT EXISTS engine_model TEXT,
ADD COLUMN IF NOT EXISTS horsepower TEXT,
ADD COLUMN IF NOT EXISTS engine_type TEXT,
ADD COLUMN IF NOT EXISTS emission_standard TEXT,
ADD COLUMN IF NOT EXISTS displacement TEXT,
ADD COLUMN IF NOT EXISTS torque TEXT,
ADD COLUMN IF NOT EXISTS fuel_type TEXT,
ADD COLUMN IF NOT EXISTS fuel_tank_capacity TEXT,
ADD COLUMN IF NOT EXISTS transmission_model TEXT,
ADD COLUMN IF NOT EXISTS transmission_type TEXT,
ADD COLUMN IF NOT EXISTS gears TEXT,
ADD COLUMN IF NOT EXISTS clutch_type TEXT,
ADD COLUMN IF NOT EXISTS front_axle_capacity TEXT,
ADD COLUMN IF NOT EXISTS rear_axle_capacity TEXT,
ADD COLUMN IF NOT EXISTS suspension_type TEXT,
ADD COLUMN IF NOT EXISTS wheelbase TEXT,
ADD COLUMN IF NOT EXISTS tyre_size TEXT,
ADD COLUMN IF NOT EXISTS tyre_quantity TEXT,
ADD COLUMN IF NOT EXISTS rim_type TEXT,
ADD COLUMN IF NOT EXISTS cabin_model TEXT,
ADD COLUMN IF NOT EXISTS seating_capacity TEXT,
ADD COLUMN IF NOT EXISTS cabin_features TEXT[],
ADD COLUMN IF NOT EXISTS driver_seat_type TEXT,
ADD COLUMN IF NOT EXISTS overall_dimensions TEXT,
ADD COLUMN IF NOT EXISTS gvw_gcw TEXT,
ADD COLUMN IF NOT EXISTS payload_capacity TEXT,
ADD COLUMN IF NOT EXISTS curb_weight TEXT,
ADD COLUMN IF NOT EXISTS max_speed TEXT,
ADD COLUMN IF NOT EXISTS gradeability TEXT,
ADD COLUMN IF NOT EXISTS turning_radius TEXT,
ADD COLUMN IF NOT EXISTS abs_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cameras TEXT,
ADD COLUMN IF NOT EXISTS gps_tracking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS multimedia_system TEXT,
ADD COLUMN IF NOT EXISTS body_dimensions TEXT,
ADD COLUMN IF NOT EXISTS body_volume TEXT,
ADD COLUMN IF NOT EXISTS special_features JSONB;

-- Create sinotruck_truck_model_images table
CREATE TABLE IF NOT EXISTS sinotruck_truck_model_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_model_id UUID NOT NULL REFERENCES sinotruck_truck_models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create storage bucket for sinotruck truck model images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sinotruck-truck-models', 'sinotruck-truck-models', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for sinotruck_truck_model_images
ALTER TABLE sinotruck_truck_model_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view truck model images"
  ON sinotruck_truck_model_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert truck model images"
  ON sinotruck_truck_model_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update truck model images"
  ON sinotruck_truck_model_images FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete truck model images"
  ON sinotruck_truck_model_images FOR DELETE
  TO authenticated
  USING (true);

-- Storage policies for sinotruck-truck-models bucket
CREATE POLICY "Public can view sinotruck truck images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sinotruck-truck-models');

CREATE POLICY "Authenticated users can upload sinotruck truck images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sinotruck-truck-models');

CREATE POLICY "Authenticated users can update sinotruck truck images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'sinotruck-truck-models');

CREATE POLICY "Authenticated users can delete sinotruck truck images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'sinotruck-truck-models');