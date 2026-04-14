-- Phase 2: Supply Chain & Logistics Tables

-- Enum for production milestones
CREATE TYPE production_milestone AS ENUM (
  'order_received',
  'production_started',
  'chassis_assembly',
  'body_assembly',
  'interior_installation',
  'quality_inspection',
  'final_testing',
  'ready_for_shipment'
);

-- Enum for shipping methods
CREATE TYPE shipping_method AS ENUM (
  'roro',
  'container'
);

-- Enum for document types
CREATE TYPE shipping_document_type AS ENUM (
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
  'certificate_of_origin',
  'insurance_certificate',
  'customs_declaration'
);

-- Supplier Orders table (Yutong integration)
CREATE TABLE public.yutong_supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  yutong_order_reference TEXT,
  supplier_order_date DATE DEFAULT CURRENT_DATE,
  production_start_date DATE,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  chassis_number TEXT,
  engine_number TEXT,
  vin_number TEXT,
  current_milestone production_milestone DEFAULT 'order_received',
  production_progress_percentage INTEGER DEFAULT 0,
  supplier_notes TEXT,
  quality_certificates JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Production Updates table
CREATE TABLE public.yutong_production_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL REFERENCES public.yutong_supplier_orders(id) ON DELETE CASCADE,
  milestone production_milestone NOT NULL,
  update_date DATE DEFAULT CURRENT_DATE,
  update_time TIMESTAMPTZ DEFAULT now(),
  milestone_completed BOOLEAN DEFAULT false,
  photos JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  progress_notes TEXT,
  quality_check_passed BOOLEAN,
  issues_identified TEXT,
  estimated_next_milestone_date DATE,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shipping Partners table
CREATE TABLE public.yutong_shipping_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  partner_code TEXT UNIQUE,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  supported_shipping_methods shipping_method[],
  partner_rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shipments table
CREATE TABLE public.yutong_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  supplier_order_id UUID REFERENCES public.yutong_supplier_orders(id),
  shipping_partner_id UUID REFERENCES public.yutong_shipping_partners(id),
  shipment_reference TEXT,
  shipping_method shipping_method NOT NULL,
  container_number TEXT,
  vessel_name TEXT,
  departure_port TEXT DEFAULT 'Zhengzhou, China',
  arrival_port TEXT DEFAULT 'Colombo, Sri Lanka',
  scheduled_departure_date DATE,
  actual_departure_date DATE,
  scheduled_arrival_date DATE,
  actual_arrival_date DATE,
  estimated_arrival_date DATE,
  tracking_number TEXT,
  current_status TEXT DEFAULT 'preparing',
  shipping_cost DECIMAL(12,2),
  insurance_amount DECIMAL(12,2),
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shipping Documents table
CREATE TABLE public.yutong_shipping_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.yutong_shipments(id) ON DELETE CASCADE,
  document_type shipping_document_type NOT NULL,
  document_number TEXT,
  document_date DATE,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  issued_by TEXT,
  verified_by UUID,
  verification_date DATE,
  document_status TEXT DEFAULT 'draft',
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shipment Tracking table
CREATE TABLE public.yutong_shipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.yutong_shipments(id) ON DELETE CASCADE,
  tracking_date TIMESTAMPTZ DEFAULT now(),
  location TEXT,
  status TEXT,
  description TEXT,
  milestone_reached TEXT,
  estimated_arrival DATE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert some default shipping partners
INSERT INTO public.yutong_shipping_partners (partner_name, partner_code, contact_email, supported_shipping_methods) VALUES
('MSC Mediterranean Shipping', 'MSC001', 'booking@msc.com', ARRAY['container'::shipping_method]),
('COSCO Shipping Lines', 'COSCO001', 'booking@cosco.com', ARRAY['container'::shipping_method, 'roro'::shipping_method]),
('Evergreen Marine', 'EVER001', 'booking@evergreen.com', ARRAY['container'::shipping_method]),
('OOCL Orient Overseas', 'OOCL001', 'booking@oocl.com', ARRAY['container'::shipping_method]),
('Wallenius Wilhelmsen', 'WW001', 'booking@2wglobal.com', ARRAY['roro'::shipping_method]);

-- Create indexes for better performance
CREATE INDEX idx_supplier_orders_order_id ON public.yutong_supplier_orders(order_id);
CREATE INDEX idx_supplier_orders_milestone ON public.yutong_supplier_orders(current_milestone);
CREATE INDEX idx_production_updates_supplier_order ON public.yutong_production_updates(supplier_order_id);
CREATE INDEX idx_production_updates_milestone ON public.yutong_production_updates(milestone);
CREATE INDEX idx_shipments_order_id ON public.yutong_shipments(order_id);
CREATE INDEX idx_shipments_status ON public.yutong_shipments(current_status);
CREATE INDEX idx_shipping_documents_shipment ON public.yutong_shipping_documents(shipment_id);
CREATE INDEX idx_shipment_tracking_shipment ON public.yutong_shipment_tracking(shipment_id);

-- Enable RLS on all tables
ALTER TABLE public.yutong_supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_production_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_shipping_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_shipping_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_shipment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view supplier orders" ON public.yutong_supplier_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage supplier orders" ON public.yutong_supplier_orders
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view production updates" ON public.yutong_production_updates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage production updates" ON public.yutong_production_updates
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view shipping partners" ON public.yutong_shipping_partners
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage shipping partners" ON public.yutong_shipping_partners
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "All authenticated users can view shipments" ON public.yutong_shipments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage shipments" ON public.yutong_shipments
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view shipping documents" ON public.yutong_shipping_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage shipping documents" ON public.yutong_shipping_documents
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view shipment tracking" ON public.yutong_shipment_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage shipment tracking" ON public.yutong_shipment_tracking
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Triggers for updated_at timestamps
CREATE TRIGGER update_supplier_orders_updated_at
  BEFORE UPDATE ON public.yutong_supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_partners_updated_at
  BEFORE UPDATE ON public.yutong_shipping_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.yutong_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_documents_updated_at
  BEFORE UPDATE ON public.yutong_shipping_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();