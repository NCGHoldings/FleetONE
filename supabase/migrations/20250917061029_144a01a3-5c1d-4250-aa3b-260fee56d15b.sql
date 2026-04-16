-- Phase 3: Compliance & Processing Tables

-- Enum for customs declaration status
CREATE TYPE customs_status AS ENUM (
  'draft',
  'submitted',
  'under_assessment',
  'duty_calculated',
  'payment_pending',
  'payment_completed',
  'cleared',
  'held',
  'rejected'
);

-- Enum for vehicle processing stages
CREATE TYPE processing_stage AS ENUM (
  'arrived',
  'dewaxing_scheduled',
  'dewaxing_completed',
  'washing_scheduled', 
  'washing_completed',
  'inspection_scheduled',
  'inspection_in_progress',
  'inspection_completed',
  'accessories_pending',
  'accessories_completed',
  'test_drive_pending',
  'test_drive_completed',
  'ready_for_registration'
);

-- Enum for RMV registration status
CREATE TYPE rmv_status AS ENUM (
  'documents_preparing',
  'application_submitted',
  'under_review',
  'additional_documents_required',
  'approved',
  'cr_print_ready',
  'cr_print_collected',
  'registration_completed',
  'rejected'
);

-- Customs Declarations table
CREATE TABLE public.yutong_customs_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.yutong_shipments(id) ON DELETE CASCADE,
  cusdec_number TEXT UNIQUE,
  declaration_date DATE DEFAULT CURRENT_DATE,
  declarant_name TEXT,
  declarant_license_no TEXT,
  consignee_name TEXT,
  consignee_address TEXT,
  goods_description TEXT,
  hs_code TEXT,
  country_of_origin TEXT DEFAULT 'China',
  invoice_value_usd DECIMAL(12,2),
  freight_cost_usd DECIMAL(12,2),
  insurance_cost_usd DECIMAL(12,2),
  cif_value_lkr DECIMAL(12,2),
  duty_rate_percentage DECIMAL(5,2),
  customs_duty_lkr DECIMAL(12,2),
  excise_duty_lkr DECIMAL(12,2),
  vat_lkr DECIMAL(12,2),
  pal_lkr DECIMAL(12,2),
  total_duties_lkr DECIMAL(12,2),
  customs_status customs_status DEFAULT 'draft',
  assessment_date DATE,
  clearance_date DATE,
  customs_officer_name TEXT,
  payment_receipt_no TEXT,
  payment_date DATE,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Port Operations table
CREATE TABLE public.yutong_port_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.yutong_shipments(id) ON DELETE CASCADE,
  port_pass_number TEXT,
  assigned_drivers JSONB DEFAULT '[]',
  driver_licenses JSONB DEFAULT '[]',
  equipment_list JSONB DEFAULT '[]',
  insurance_cover_note TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry_date DATE,
  operation_date DATE DEFAULT CURRENT_DATE,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  vehicle_condition_on_arrival TEXT,
  photos_on_arrival JSONB DEFAULT '[]',
  operation_status TEXT DEFAULT 'scheduled',
  operation_notes TEXT,
  supervisor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vehicle Processing table
CREATE TABLE public.yutong_vehicle_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.yutong_shipments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id),
  chassis_number TEXT,
  engine_number TEXT,
  current_stage processing_stage DEFAULT 'arrived',
  stage_progress_percentage INTEGER DEFAULT 0,
  arrival_date DATE,
  dewaxing_scheduled_date DATE,
  dewaxing_completed_date DATE,
  dewaxing_contractor TEXT,
  washing_scheduled_date DATE,
  washing_completed_date DATE,
  washing_contractor TEXT,
  inspection_scheduled_date DATE,
  inspection_completed_date DATE,
  inspector_name TEXT,
  defects_identified JSONB DEFAULT '[]',
  defects_resolved JSONB DEFAULT '[]',
  accessories_required JSONB DEFAULT '[]',
  accessories_installed JSONB DEFAULT '[]',
  test_drive_date DATE,
  test_drive_km_reading INTEGER,
  test_drive_notes TEXT,
  fuel_level_on_arrival INTEGER DEFAULT 0,
  fuel_added_liters INTEGER DEFAULT 150,
  dvr_sim_installed BOOLEAN DEFAULT false,
  processing_location TEXT,
  processing_supervisor TEXT,
  ready_for_delivery BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-delivery Inspection table
CREATE TABLE public.yutong_pre_delivery_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_processing_id UUID NOT NULL REFERENCES public.yutong_vehicle_processing(id) ON DELETE CASCADE,
  inspection_date DATE DEFAULT CURRENT_DATE,
  inspector_name TEXT NOT NULL,
  mechanical_checks JSONB DEFAULT '{}',
  electrical_checks JSONB DEFAULT '{}',
  exterior_checks JSONB DEFAULT '{}',
  interior_checks JSONB DEFAULT '{}',
  safety_checks JSONB DEFAULT '{}',
  overall_condition_rating INTEGER CHECK (overall_condition_rating >= 1 AND overall_condition_rating <= 5),
  defects_found JSONB DEFAULT '[]',
  critical_issues JSONB DEFAULT '[]',
  recommendations TEXT,
  inspection_passed BOOLEAN DEFAULT false,
  customer_notified BOOLEAN DEFAULT false,
  yutong_notified BOOLEAN DEFAULT false,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,
  inspection_photos JSONB DEFAULT '[]',
  inspector_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RMV Registration table
CREATE TABLE public.yutong_rmv_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  vehicle_processing_id UUID REFERENCES public.yutong_vehicle_processing(id),
  application_number TEXT UNIQUE,
  chassis_number TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  model_year INTEGER,
  registration_status rmv_status DEFAULT 'documents_preparing',
  application_date DATE,
  submission_date DATE,
  assigned_rmv_officer TEXT,
  rmv_office_location TEXT DEFAULT 'Colombo',
  documents_submitted JSONB DEFAULT '[]',
  additional_documents_required JSONB DEFAULT '[]',
  inspection_date DATE,
  inspection_officer TEXT,
  inspection_passed BOOLEAN,
  inspection_notes TEXT,
  cr_print_date DATE,
  registration_number TEXT,
  registration_certificate_number TEXT,
  number_plate_issued TEXT,
  registration_fees_lkr DECIMAL(10,2),
  processing_fees_lkr DECIMAL(10,2),
  total_fees_paid_lkr DECIMAL(10,2),
  payment_receipt_number TEXT,
  completion_date DATE,
  assigned_staff_member TEXT,
  status_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compliance Certificates table
CREATE TABLE public.yutong_compliance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL,
  certificate_name TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  certificate_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  certificate_status TEXT DEFAULT 'required',
  application_date DATE,
  approval_date DATE,
  file_path TEXT,
  file_name TEXT,
  compliance_notes TEXT,
  renewal_required BOOLEAN DEFAULT false,
  renewal_reminder_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default accessories list for vehicle processing
INSERT INTO public.yutong_vehicle_processing (id, shipment_id, order_id, chassis_number) VALUES 
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'DEFAULT')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_customs_declarations_shipment ON public.yutong_customs_declarations(shipment_id);
CREATE INDEX idx_customs_declarations_status ON public.yutong_customs_declarations(customs_status);
CREATE INDEX idx_customs_declarations_cusdec ON public.yutong_customs_declarations(cusdec_number);
CREATE INDEX idx_port_operations_shipment ON public.yutong_port_operations(shipment_id);
CREATE INDEX idx_vehicle_processing_order ON public.yutong_vehicle_processing(order_id);
CREATE INDEX idx_vehicle_processing_stage ON public.yutong_vehicle_processing(current_stage);
CREATE INDEX idx_vehicle_processing_chassis ON public.yutong_vehicle_processing(chassis_number);
CREATE INDEX idx_pre_delivery_inspections_vehicle ON public.yutong_pre_delivery_inspections(vehicle_processing_id);
CREATE INDEX idx_rmv_registrations_order ON public.yutong_rmv_registrations(order_id);
CREATE INDEX idx_rmv_registrations_status ON public.yutong_rmv_registrations(registration_status);
CREATE INDEX idx_rmv_registrations_application ON public.yutong_rmv_registrations(application_number);
CREATE INDEX idx_compliance_certificates_order ON public.yutong_compliance_certificates(order_id);
CREATE INDEX idx_compliance_certificates_type ON public.yutong_compliance_certificates(certificate_type);

-- Enable RLS on all tables
ALTER TABLE public.yutong_customs_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_port_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_vehicle_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_pre_delivery_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_rmv_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_compliance_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view customs declarations" ON public.yutong_customs_declarations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customs declarations" ON public.yutong_customs_declarations
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view port operations" ON public.yutong_port_operations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage port operations" ON public.yutong_port_operations
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view vehicle processing" ON public.yutong_vehicle_processing
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage vehicle processing" ON public.yutong_vehicle_processing
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view pre-delivery inspections" ON public.yutong_pre_delivery_inspections
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage pre-delivery inspections" ON public.yutong_pre_delivery_inspections
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view RMV registrations" ON public.yutong_rmv_registrations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage RMV registrations" ON public.yutong_rmv_registrations
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "All authenticated users can view compliance certificates" ON public.yutong_compliance_certificates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage compliance certificates" ON public.yutong_compliance_certificates
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Triggers for updated_at timestamps
CREATE TRIGGER update_customs_declarations_updated_at
  BEFORE UPDATE ON public.yutong_customs_declarations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_port_operations_updated_at
  BEFORE UPDATE ON public.yutong_port_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_processing_updated_at
  BEFORE UPDATE ON public.yutong_vehicle_processing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rmv_registrations_updated_at
  BEFORE UPDATE ON public.yutong_rmv_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_certificates_updated_at
  BEFORE UPDATE ON public.yutong_compliance_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();