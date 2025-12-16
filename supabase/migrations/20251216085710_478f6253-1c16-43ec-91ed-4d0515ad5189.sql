-- Light Vehicle Models
CREATE TABLE public.lightvehicle_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'toyota',
  category TEXT NOT NULL DEFAULT 'sedan',
  engine_cc TEXT,
  transmission TEXT DEFAULT 'automatic',
  fuel_type TEXT DEFAULT 'petrol',
  drive_type TEXT DEFAULT '2wd',
  year INTEGER,
  mileage INTEGER,
  color_options TEXT[],
  base_price NUMERIC DEFAULT 0,
  features TEXT,
  specifications JSONB DEFAULT '{}',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.lightvehicle_model_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.lightvehicle_models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Add-ons
CREATE TABLE public.lightvehicle_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_name TEXT NOT NULL,
  category TEXT DEFAULT 'accessory',
  description TEXT,
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Quotations
CREATE TABLE public.lightvehicle_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number TEXT NOT NULL UNIQUE,
  version_number INTEGER DEFAULT 1,
  parent_quotation_id UUID REFERENCES public.lightvehicle_quotations(id),
  is_active_version BOOLEAN DEFAULT true,
  customer_type TEXT DEFAULT 'personal',
  customer_name TEXT NOT NULL,
  representative_name TEXT,
  designation TEXT,
  company_name TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  finance_company TEXT,
  contact_person TEXT,
  business_registration TEXT,
  tax_registration TEXT,
  model_id UUID REFERENCES public.lightvehicle_models(id),
  vehicle_name TEXT,
  brand TEXT,
  category TEXT,
  engine_cc TEXT,
  transmission TEXT,
  fuel_type TEXT,
  color TEXT,
  year INTEGER,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  additional_charges NUMERIC DEFAULT 0,
  additional_charges_description TEXT,
  grand_total NUMERIC DEFAULT 0,
  payment_terms TEXT,
  delivery_terms TEXT,
  warranty_terms TEXT,
  validity_period TEXT DEFAULT '30 days',
  notes TEXT,
  status TEXT DEFAULT 'draft',
  referral_agent_id UUID REFERENCES public.referral_agents(id),
  main_customer_name TEXT,
  is_sub_customer BOOLEAN DEFAULT false,
  relationship_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Quotation Add-ons
CREATE TABLE public.lightvehicle_quotation_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID REFERENCES public.lightvehicle_quotations(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES public.lightvehicle_addons(id),
  addon_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Quotation Signatures
CREATE TABLE public.lightvehicle_quotation_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID REFERENCES public.lightvehicle_quotations(id) ON DELETE CASCADE,
  signature_role TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT,
  signature_type TEXT DEFAULT 'drawing',
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  signed_by UUID,
  UNIQUE(quotation_id, signature_role)
);

-- Light Vehicle Orders
CREATE TABLE public.lightvehicle_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  quotation_id UUID REFERENCES public.lightvehicle_quotations(id),
  customer_name TEXT NOT NULL,
  company_name TEXT,
  vehicle_name TEXT,
  brand TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  current_phase TEXT DEFAULT 'order_confirmed',
  progress_percentage INTEGER DEFAULT 0,
  payment_mode TEXT DEFAULT 'full_payment',
  payment_structure JSONB DEFAULT '{}',
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Order Tasks
CREATE TABLE public.lightvehicle_order_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.lightvehicle_orders(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  description TEXT,
  process_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Payment Schedules
CREATE TABLE public.lightvehicle_payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.lightvehicle_orders(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Customer Payments
CREATE TABLE public.lightvehicle_customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.lightvehicle_orders(id) ON DELETE CASCADE,
  payment_schedule_id UUID REFERENCES public.lightvehicle_payment_schedules(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  receipt_url TEXT,
  notes TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Invoice Records
CREATE TABLE public.lightvehicle_invoice_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.lightvehicle_orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT DEFAULT 'proforma',
  invoice_data JSONB DEFAULT '{}',
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Invoice Documents
CREATE TABLE public.lightvehicle_invoice_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id UUID REFERENCES public.lightvehicle_invoice_records(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'invoice',
  document_data TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Invoice Signatures
CREATE TABLE public.lightvehicle_invoice_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id UUID REFERENCES public.lightvehicle_invoice_records(id) ON DELETE CASCADE,
  signature_role TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT,
  signature_type TEXT DEFAULT 'drawing',
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  signed_by UUID,
  UNIQUE(invoice_record_id, signature_role)
);

-- Light Vehicle Customers
CREATE TABLE public.lightvehicle_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  customer_type TEXT DEFAULT 'personal',
  phone TEXT,
  email TEXT,
  address TEXT,
  nic_number TEXT,
  business_registration TEXT,
  tax_registration TEXT,
  notes TEXT,
  total_purchases NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Shipment Groups
CREATE TABLE public.lightvehicle_shipment_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_number TEXT NOT NULL UNIQUE,
  shipment_name TEXT,
  status TEXT DEFAULT 'planning',
  vessel_name TEXT,
  container_number TEXT,
  bl_number TEXT,
  origin_port TEXT,
  destination_port TEXT,
  expected_departure DATE,
  expected_arrival DATE,
  actual_departure DATE,
  actual_arrival DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Shipment Group Orders
CREATE TABLE public.lightvehicle_shipment_group_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_group_id UUID REFERENCES public.lightvehicle_shipment_groups(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.lightvehicle_orders(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(order_id)
);

-- Light Vehicle Vehicle Data Sheets
CREATE TABLE public.lightvehicle_vehicle_data_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  shipment_reference TEXT,
  total_vehicles INTEGER DEFAULT 0,
  matched_vehicles INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Vehicle Records
CREATE TABLE public.lightvehicle_vehicle_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_sheet_id UUID REFERENCES public.lightvehicle_vehicle_data_sheets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.lightvehicle_orders(id),
  vehicle_number TEXT,
  model_name TEXT,
  brand TEXT,
  category TEXT,
  engine_number TEXT,
  chassis_number TEXT,
  color TEXT,
  year INTEGER,
  mileage INTEGER,
  customer_name TEXT,
  is_matched BOOLEAN DEFAULT false,
  match_type TEXT,
  matched_at TIMESTAMP WITH TIME ZONE,
  matched_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Referral Commission Payments
CREATE TABLE public.lightvehicle_referral_commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID REFERENCES public.lightvehicle_quotations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.referral_agents(id),
  agent_name TEXT,
  commission_amount NUMERIC DEFAULT 0,
  commission_percentage NUMERIC DEFAULT 0,
  quotation_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_date DATE,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Responsible Persons (Settings)
CREATE TABLE public.lightvehicle_responsible_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  person_name TEXT NOT NULL,
  designation TEXT,
  signature_data TEXT,
  signature_type TEXT DEFAULT 'text',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Light Vehicle Customization Options
CREATE TABLE public.lightvehicle_customization_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_type TEXT NOT NULL,
  option_value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lightvehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_model_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_quotation_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_quotation_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_order_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_invoice_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_shipment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_shipment_group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_vehicle_data_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_vehicle_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_referral_commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_responsible_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_customization_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables (authenticated users can manage)
CREATE POLICY "Authenticated users can manage lightvehicle_models" ON public.lightvehicle_models FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_model_images" ON public.lightvehicle_model_images FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_addons" ON public.lightvehicle_addons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_quotations" ON public.lightvehicle_quotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_quotation_addons" ON public.lightvehicle_quotation_addons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_quotation_signatures" ON public.lightvehicle_quotation_signatures FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_orders" ON public.lightvehicle_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_order_tasks" ON public.lightvehicle_order_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_payment_schedules" ON public.lightvehicle_payment_schedules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_customer_payments" ON public.lightvehicle_customer_payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_records" ON public.lightvehicle_invoice_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_documents" ON public.lightvehicle_invoice_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_signatures" ON public.lightvehicle_invoice_signatures FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_customers" ON public.lightvehicle_customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_shipment_groups" ON public.lightvehicle_shipment_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_shipment_group_orders" ON public.lightvehicle_shipment_group_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_vehicle_data_sheets" ON public.lightvehicle_vehicle_data_sheets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_vehicle_records" ON public.lightvehicle_vehicle_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_referral_commission_payments" ON public.lightvehicle_referral_commission_payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_responsible_persons" ON public.lightvehicle_responsible_persons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lightvehicle_customization_options" ON public.lightvehicle_customization_options FOR ALL USING (auth.role() = 'authenticated');

-- Create function to generate Light Vehicle quotation numbers
CREATE OR REPLACE FUNCTION generate_lightvehicle_quotation_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_quotation_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 'LVQ-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM lightvehicle_quotations
  WHERE quotation_number LIKE 'LVQ-' || current_year || '-%';
  new_quotation_number := 'LVQ-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN new_quotation_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate Light Vehicle order numbers
CREATE OR REPLACE FUNCTION generate_lightvehicle_order_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_order_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'LVO-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM lightvehicle_orders
  WHERE order_number LIKE 'LVO-' || current_year || '-%';
  new_order_number := 'LVO-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate Light Vehicle shipment numbers
CREATE OR REPLACE FUNCTION generate_lightvehicle_shipment_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_shipment_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(shipment_number FROM 'LVS-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM lightvehicle_shipment_groups
  WHERE shipment_number LIKE 'LVS-' || current_year || '-%';
  new_shipment_number := 'LVS-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  RETURN new_shipment_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quotation number
CREATE OR REPLACE FUNCTION set_lightvehicle_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := generate_lightvehicle_quotation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_lightvehicle_quotation_number
  BEFORE INSERT ON public.lightvehicle_quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_lightvehicle_quotation_number();

-- Create trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_lightvehicle_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_lightvehicle_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_lightvehicle_order_number
  BEFORE INSERT ON public.lightvehicle_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_lightvehicle_order_number();

-- Create trigger to auto-generate shipment number
CREATE OR REPLACE FUNCTION set_lightvehicle_shipment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
    NEW.shipment_number := generate_lightvehicle_shipment_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_lightvehicle_shipment_number
  BEFORE INSERT ON public.lightvehicle_shipment_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_lightvehicle_shipment_number();

-- Create trigger to track referral commission
CREATE OR REPLACE FUNCTION track_lightvehicle_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.referral_agent_id IS NOT NULL THEN
    INSERT INTO lightvehicle_referral_commission_payments (
      quotation_id, agent_id, agent_name, commission_amount, commission_percentage, quotation_value, status
    )
    SELECT 
      NEW.id,
      NEW.referral_agent_id,
      ra.name,
      NEW.grand_total * COALESCE(ra.commission_rate, 1.5) / 100,
      COALESCE(ra.commission_rate, 1.5),
      NEW.grand_total,
      'pending'
    FROM referral_agents ra
    WHERE ra.id = NEW.referral_agent_id
    ON CONFLICT (quotation_id) DO NOTHING;
    
    UPDATE referral_agents
    SET total_referrals = total_referrals + 1,
        total_commission_earned = total_commission_earned + (NEW.grand_total * COALESCE(commission_rate, 1.5) / 100)
    WHERE id = NEW.referral_agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_lightvehicle_referral_commission
  AFTER UPDATE ON public.lightvehicle_quotations
  FOR EACH ROW
  EXECUTE FUNCTION track_lightvehicle_referral_commission();

-- Insert default responsible persons
INSERT INTO public.lightvehicle_responsible_persons (role, person_name, designation) VALUES
('sales_manager', 'Sales Manager', 'Sales Manager'),
('approved_by', 'Manager', 'General Manager'),
('prepared_by', 'Sales Executive', 'Sales Executive');

-- Insert default customization options
INSERT INTO public.lightvehicle_customization_options (option_type, option_value, display_order) VALUES
('transmission', 'Automatic', 1),
('transmission', 'Manual', 2),
('transmission', 'CVT', 3),
('fuel_type', 'Petrol', 1),
('fuel_type', 'Diesel', 2),
('fuel_type', 'Hybrid', 3),
('fuel_type', 'Electric', 4),
('drive_type', '2WD', 1),
('drive_type', '4WD', 2),
('drive_type', 'AWD', 3),
('color', 'White', 1),
('color', 'Black', 2),
('color', 'Silver', 3),
('color', 'Grey', 4),
('color', 'Red', 5),
('color', 'Blue', 6);

-- Insert sample vehicle models
INSERT INTO public.lightvehicle_models (vehicle_name, model_name, brand, category, engine_cc, transmission, fuel_type, drive_type, year, base_price, is_active) VALUES
('Honda CR-V', 'CR-V EX', 'honda', 'suv', '1500cc Turbo', 'CVT', 'petrol', '2wd', 2024, 12500000, true),
('Honda Vezel', 'Vezel e:HEV', 'honda', 'suv', '1500cc Hybrid', 'CVT', 'hybrid', '2wd', 2024, 9800000, true),
('Toyota RAV4', 'RAV4 Adventure', 'toyota', 'suv', '2500cc', 'automatic', 'petrol', '4wd', 2024, 15000000, true),
('Toyota Corolla Cross', 'Corolla Cross GR Sport', 'toyota', 'suv', '1800cc Hybrid', 'CVT', 'hybrid', '2wd', 2024, 11500000, true),
('Toyota Camry', 'Camry Hybrid', 'toyota', 'sedan', '2500cc Hybrid', 'CVT', 'hybrid', '2wd', 2024, 14000000, true),
('Honda Civic', 'Civic RS', 'honda', 'sedan', '1500cc Turbo', 'CVT', 'petrol', '2wd', 2024, 11000000, true),
('Mitsubishi Outlander', 'Outlander PHEV', 'mitsubishi', 'suv', '2400cc PHEV', 'automatic', 'hybrid', '4wd', 2024, 18000000, true),
('Mitsubishi L200', 'Triton Athlete', 'mitsubishi', 'pickup', '2400cc Diesel', 'automatic', 'diesel', '4wd', 2024, 13500000, true),
('Suzuki Swift', 'Swift GLX', 'suzuki', 'hatchback', '1200cc', 'CVT', 'petrol', '2wd', 2024, 5500000, true),
('Suzuki Jimny', 'Jimny Sierra', 'suzuki', 'suv', '1500cc', 'automatic', 'petrol', '4wd', 2024, 8500000, true),
('Toyota Hilux', 'Hilux Revo Rocco', 'toyota', 'pickup', '2800cc Diesel', 'automatic', 'diesel', '4wd', 2024, 14500000, true),
('Honda City', 'City RS', 'honda', 'sedan', '1000cc Turbo', 'CVT', 'petrol', '2wd', 2024, 7500000, true),
('Suzuki Baleno', 'Baleno GLX', 'suzuki', 'hatchback', '1200cc', 'CVT', 'petrol', '2wd', 2024, 5000000, true),
('Toyota Yaris', 'Yaris Cross', 'toyota', 'compact', '1500cc Hybrid', 'CVT', 'hybrid', '2wd', 2024, 8000000, true),
('Mitsubishi Xpander', 'Xpander Cross', 'mitsubishi', 'suv', '1500cc', 'CVT', 'petrol', '2wd', 2024, 7800000, true);

-- Insert sample add-ons
INSERT INTO public.lightvehicle_addons (addon_name, category, description, price) VALUES
('Window Tinting', 'exterior', 'Premium window tinting for all windows', 35000),
('Leather Seat Covers', 'interior', 'Custom leather seat covers', 85000),
('Dash Camera', 'electronics', 'Front and rear dash camera system', 45000),
('GPS Navigation', 'electronics', 'Built-in GPS navigation system', 65000),
('Parking Sensors', 'safety', 'Front and rear parking sensors', 40000),
('Reverse Camera', 'safety', 'High-definition reverse camera', 25000),
('Floor Mats', 'interior', 'Premium rubber floor mats', 15000),
('Roof Rack', 'exterior', 'Aluminum roof rack system', 55000),
('Body Kit', 'exterior', 'Sporty body kit package', 150000),
('Alloy Wheels', 'exterior', 'Upgraded alloy wheel set', 120000);