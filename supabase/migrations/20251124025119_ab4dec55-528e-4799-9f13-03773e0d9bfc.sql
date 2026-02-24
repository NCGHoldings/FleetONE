-- Create tyre brands catalog table
CREATE TABLE IF NOT EXISTS public.tyre_brands_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  model_name TEXT,
  size TEXT NOT NULL,
  type TEXT, -- 'Radial', 'Bias'
  expected_lifespan_km INTEGER DEFAULT 80000,
  average_cost NUMERIC DEFAULT 0,
  supplier TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bus tyres table (core inventory)
CREATE TABLE IF NOT EXISTS public.bus_tyres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  tyre_serial_number TEXT UNIQUE,
  tyre_brand TEXT NOT NULL,
  tyre_type TEXT,
  tyre_size TEXT NOT NULL,
  position TEXT NOT NULL, -- 'Front Left', 'Front Right', 'Rear Left 1', etc.
  purchase_date DATE,
  installation_date DATE NOT NULL,
  purchase_cost NUMERIC DEFAULT 0,
  expected_lifespan_km INTEGER DEFAULT 80000,
  current_tread_depth_mm NUMERIC,
  original_tread_depth_mm NUMERIC DEFAULT 18.0,
  status TEXT DEFAULT 'active', -- 'active', 'removed', 'damaged', 'retired'
  km_at_installation INTEGER DEFAULT 0,
  current_km INTEGER DEFAULT 0,
  condition_percentage NUMERIC DEFAULT 100,
  last_rotation_date DATE,
  notes TEXT,
  nsp_sale_reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tyre rotation history table
CREATE TABLE IF NOT EXISTS public.tyre_rotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  rotation_date DATE NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  rotation_type TEXT, -- 'cross-rotation', 'front-to-rear', 'swap-sides'
  tyres_moved JSONB, -- [{tyre_id, from_position, to_position}]
  reason TEXT,
  km_at_rotation INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tyre inspection records table
CREATE TABLE IF NOT EXISTS public.tyre_inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  tyre_id UUID REFERENCES public.bus_tyres(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspector_id UUID REFERENCES auth.users(id),
  tread_depth_mm NUMERIC,
  pressure_psi NUMERIC,
  condition_status TEXT DEFAULT 'good', -- 'good', 'fair', 'poor', 'critical'
  wear_pattern TEXT, -- 'even', 'center_wear', 'edge_wear', 'cupping'
  damage_notes TEXT,
  photos JSONB,
  recommendation TEXT, -- 'continue_use', 'rotate_soon', 'replace_soon', 'replace_urgent'
  next_inspection_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add tyre-related columns to buses table
ALTER TABLE public.buses 
ADD COLUMN IF NOT EXISTS total_tyres INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS tyre_size_standard TEXT DEFAULT '295/80R22.5';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bus_tyres_bus_id ON public.bus_tyres(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_tyres_status ON public.bus_tyres(status);
CREATE INDEX IF NOT EXISTS idx_tyre_rotation_history_bus_id ON public.tyre_rotation_history(bus_id);
CREATE INDEX IF NOT EXISTS idx_tyre_inspection_records_bus_id ON public.tyre_inspection_records(bus_id);
CREATE INDEX IF NOT EXISTS idx_tyre_inspection_records_tyre_id ON public.tyre_inspection_records(tyre_id);

-- Function to calculate tyre condition percentage
CREATE OR REPLACE FUNCTION public.calculate_tyre_condition(
  p_tyre_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_condition NUMERIC;
  v_tread_condition NUMERIC;
  v_km_condition NUMERIC;
  v_age_condition NUMERIC;
  v_tyre RECORD;
BEGIN
  SELECT * INTO v_tyre FROM public.bus_tyres WHERE id = p_tyre_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate based on tread depth (60% weight)
  v_tread_condition := (v_tyre.current_tread_depth_mm / NULLIF(v_tyre.original_tread_depth_mm, 0)) * 60;
  
  -- Calculate based on km driven (30% weight)
  v_km_condition := GREATEST(0, (1 - ((v_tyre.current_km - v_tyre.km_at_installation) / NULLIF(v_tyre.expected_lifespan_km, 0)::NUMERIC)) * 30);
  
  -- Calculate based on age (10% weight)
  v_age_condition := GREATEST(0, (1 - (EXTRACT(DAYS FROM (CURRENT_DATE - v_tyre.installation_date)) / 1095.0)) * 10);
  
  v_condition := LEAST(100, GREATEST(0, v_tread_condition + v_km_condition + v_age_condition));
  
  RETURN v_condition;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update all tyre conditions
CREATE OR REPLACE FUNCTION public.update_all_tyre_conditions()
RETURNS void AS $$
BEGIN
  UPDATE public.bus_tyres
  SET 
    condition_percentage = public.calculate_tyre_condition(id),
    current_km = (SELECT current_mileage FROM public.buses WHERE id = bus_tyres.bus_id),
    updated_at = now()
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update tyre condition on inspection
CREATE OR REPLACE FUNCTION public.update_tyre_from_inspection()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.bus_tyres
  SET 
    current_tread_depth_mm = NEW.tread_depth_mm,
    condition_percentage = public.calculate_tyre_condition(NEW.tyre_id),
    updated_at = now()
  WHERE id = NEW.tyre_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_tyre_from_inspection
AFTER INSERT ON public.tyre_inspection_records
FOR EACH ROW
EXECUTE FUNCTION public.update_tyre_from_inspection();

-- RLS Policies
ALTER TABLE public.tyre_brands_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_tyres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_inspection_records ENABLE ROW LEVEL SECURITY;

-- Tyre brands catalog policies
CREATE POLICY "All authenticated users can view tyre brands"
  ON public.tyre_brands_catalog FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage tyre brands"
  ON public.tyre_brands_catalog FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor')
  );

-- Bus tyres policies
CREATE POLICY "All authenticated users can view bus tyres"
  ON public.bus_tyres FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage bus tyres"
  ON public.bus_tyres FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor')
  );

-- Rotation history policies
CREATE POLICY "All authenticated users can view rotation history"
  ON public.tyre_rotation_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage rotation history"
  ON public.tyre_rotation_history FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor')
  );

-- Inspection records policies
CREATE POLICY "All authenticated users can view inspection records"
  ON public.tyre_inspection_records FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage inspection records"
  ON public.tyre_inspection_records FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor')
  );

-- Insert some default tyre brands
INSERT INTO public.tyre_brands_catalog (brand_name, model_name, size, type, expected_lifespan_km, average_cost) VALUES
('Maxload', 'ML-216', '295/80R22.5', 'Radial', 80000, 45000),
('Double Coin', 'RR202', '295/80R22.5', 'Radial', 85000, 48000),
('CEAT', 'Mile XL Pro', '295/80R22.5', 'Radial', 90000, 52000),
('MRF', 'Super Lug', '10.00-20', 'Bias', 70000, 38000),
('JK Tyre', 'Jetway', '295/80R22.5', 'Radial', 82000, 46000)
ON CONFLICT DO NOTHING;