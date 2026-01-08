-- Create sequence for shipment group numbers
CREATE SEQUENCE IF NOT EXISTS public.yutong_shipment_group_seq START 1;

-- Create Shipment Groups table (for grouping multiple orders)
CREATE TABLE IF NOT EXISTS public.yutong_shipment_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_no TEXT NOT NULL UNIQUE,
  shipment_name TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_transit', 'customs', 'delivered', 'cancelled')),
  
  -- Shipping details
  expected_departure_date DATE,
  actual_departure_date DATE,
  expected_arrival_date DATE,
  actual_arrival_date DATE,
  vessel_name TEXT,
  container_numbers TEXT[],
  bill_of_lading_no TEXT,
  
  -- Progress tracking from orders
  current_phase TEXT,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for shipment-order relationship
CREATE TABLE IF NOT EXISTS public.yutong_shipment_group_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_group_id UUID NOT NULL REFERENCES public.yutong_shipment_groups(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(order_id) -- An order can only be in one shipment group at a time
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_yutong_shipment_groups_status ON public.yutong_shipment_groups(status);
CREATE INDEX IF NOT EXISTS idx_yutong_shipment_groups_departure ON public.yutong_shipment_groups(expected_departure_date);
CREATE INDEX IF NOT EXISTS idx_yutong_shipment_group_orders_shipment ON public.yutong_shipment_group_orders(shipment_group_id);
CREATE INDEX IF NOT EXISTS idx_yutong_shipment_group_orders_order ON public.yutong_shipment_group_orders(order_id);

-- Enable Row Level Security
ALTER TABLE public.yutong_shipment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_shipment_group_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view shipment groups" 
  ON public.yutong_shipment_groups FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage shipment groups" 
  ON public.yutong_shipment_groups FOR ALL 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can view shipment group orders" 
  ON public.yutong_shipment_group_orders FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage shipment group orders" 
  ON public.yutong_shipment_group_orders FOR ALL 
  TO authenticated USING (true);

-- Function to generate shipment group number
CREATE OR REPLACE FUNCTION public.generate_yutong_shipment_group_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_shipment_group_seq');
  RETURN 'YTS-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$$;

-- Trigger to auto-generate shipment number
CREATE OR REPLACE FUNCTION public.set_yutong_shipment_group_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.shipment_no IS NULL OR NEW.shipment_no = '' THEN
    NEW.shipment_no = public.generate_yutong_shipment_group_no();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_yutong_shipment_group_no_trigger ON public.yutong_shipment_groups;
CREATE TRIGGER set_yutong_shipment_group_no_trigger
  BEFORE INSERT ON public.yutong_shipment_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yutong_shipment_group_no();

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_yutong_shipment_groups_updated_at ON public.yutong_shipment_groups;
CREATE TRIGGER update_yutong_shipment_groups_updated_at
  BEFORE UPDATE ON public.yutong_shipment_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update shipment group phase based on orders
CREATE OR REPLACE FUNCTION public.update_shipment_group_phase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_shipment_id UUID;
  v_min_phase TEXT;
BEGIN
  v_shipment_id := COALESCE(NEW.shipment_group_id, OLD.shipment_group_id);
  
  -- Find minimum phase among all orders in this shipment
  SELECT o.current_phase INTO v_min_phase
  FROM public.yutong_shipment_group_orders so
  JOIN public.yutong_orders o ON so.order_id = o.id
  WHERE so.shipment_group_id = v_shipment_id
  ORDER BY 
    CASE o.current_phase
      WHEN 'order_confirmation' THEN 1
      WHEN 'lc_issuance' THEN 2
      WHEN 'production_order' THEN 3
      WHEN 'manufacturing' THEN 4
      WHEN 'shipping_booking' THEN 5
      WHEN 'customs_clearance' THEN 6
      WHEN 'port_operations' THEN 7
      WHEN 'vehicle_processing' THEN 8
      WHEN 'rmv_registration' THEN 9
      WHEN 'final_inspection' THEN 10
      WHEN 'delivery' THEN 11
    END
  LIMIT 1;
  
  IF v_min_phase IS NOT NULL THEN
    UPDATE public.yutong_shipment_groups
    SET current_phase = v_min_phase
    WHERE id = v_shipment_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update phase when orders are added/removed
DROP TRIGGER IF EXISTS update_shipment_group_phase_on_link ON public.yutong_shipment_group_orders;
CREATE TRIGGER update_shipment_group_phase_on_link
  AFTER INSERT OR DELETE ON public.yutong_shipment_group_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shipment_group_phase();

COMMENT ON TABLE public.yutong_shipment_groups IS 'Groups multiple Yutong orders into shipment batches for bulk tracking';
COMMENT ON TABLE public.yutong_shipment_group_orders IS 'Junction table linking orders to shipment groups';