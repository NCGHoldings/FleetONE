-- Create table for uploaded vehicle data sheets
CREATE TABLE public.yutong_vehicle_data_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name TEXT NOT NULL,
  shipment_group_id UUID REFERENCES public.yutong_shipment_groups(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  total_vehicles INTEGER DEFAULT 0,
  matched_vehicles INTEGER DEFAULT 0,
  pending_vehicles INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'completed')),
  column_mapping JSONB,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for individual vehicle records
CREATE TABLE public.yutong_vehicle_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_sheet_id UUID REFERENCES public.yutong_vehicle_data_sheets(id) ON DELETE CASCADE,
  shipment_group_id UUID REFERENCES public.yutong_shipment_groups(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.yutong_orders(id) ON DELETE SET NULL,
  vehicle_no TEXT,
  model TEXT NOT NULL,
  engine_no TEXT,
  chassis_no TEXT,
  seat_config TEXT,
  color TEXT,
  customer_name TEXT,
  year_of_manufacture INTEGER,
  country_of_origin TEXT DEFAULT 'CHINA',
  vehicle_condition TEXT DEFAULT 'BRAND NEW',
  fuel_type TEXT DEFAULT 'DIESEL',
  engine_capacity INTEGER,
  is_matched BOOLEAN DEFAULT FALSE,
  match_status TEXT DEFAULT 'pending' CHECK (match_status IN ('pending', 'auto_matched', 'manually_matched', 'unmatched')),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.yutong_vehicle_data_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_vehicle_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle data sheets
CREATE POLICY "Authenticated users can view vehicle data sheets"
ON public.yutong_vehicle_data_sheets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vehicle data sheets"
ON public.yutong_vehicle_data_sheets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicle data sheets"
ON public.yutong_vehicle_data_sheets FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete vehicle data sheets"
ON public.yutong_vehicle_data_sheets FOR DELETE TO authenticated USING (true);

-- RLS policies for vehicle records
CREATE POLICY "Authenticated users can view vehicle records"
ON public.yutong_vehicle_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vehicle records"
ON public.yutong_vehicle_records FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicle records"
ON public.yutong_vehicle_records FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete vehicle records"
ON public.yutong_vehicle_records FOR DELETE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX idx_vehicle_records_data_sheet ON public.yutong_vehicle_records(data_sheet_id);
CREATE INDEX idx_vehicle_records_shipment ON public.yutong_vehicle_records(shipment_group_id);
CREATE INDEX idx_vehicle_records_order ON public.yutong_vehicle_records(order_id);
CREATE INDEX idx_vehicle_records_match_status ON public.yutong_vehicle_records(match_status);
CREATE INDEX idx_vehicle_data_sheets_shipment ON public.yutong_vehicle_data_sheets(shipment_group_id);

-- Trigger to update sheet counts when vehicle records change
CREATE OR REPLACE FUNCTION public.update_vehicle_data_sheet_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.yutong_vehicle_data_sheets
  SET 
    total_vehicles = (SELECT COUNT(*) FROM public.yutong_vehicle_records WHERE data_sheet_id = COALESCE(NEW.data_sheet_id, OLD.data_sheet_id)),
    matched_vehicles = (SELECT COUNT(*) FROM public.yutong_vehicle_records WHERE data_sheet_id = COALESCE(NEW.data_sheet_id, OLD.data_sheet_id) AND is_matched = true),
    pending_vehicles = (SELECT COUNT(*) FROM public.yutong_vehicle_records WHERE data_sheet_id = COALESCE(NEW.data_sheet_id, OLD.data_sheet_id) AND is_matched = false),
    status = CASE 
      WHEN (SELECT COUNT(*) FROM public.yutong_vehicle_records WHERE data_sheet_id = COALESCE(NEW.data_sheet_id, OLD.data_sheet_id) AND is_matched = false) = 0 
      THEN 'completed'
      ELSE 'processed'
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.data_sheet_id, OLD.data_sheet_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_sheet_counts_on_vehicle_change
AFTER INSERT OR UPDATE OR DELETE ON public.yutong_vehicle_records
FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_data_sheet_counts();