-- =====================================================
-- ERPNext Feature Parity Migration
-- Phase 1: Payment Terms & Selling Module
-- =====================================================

-- Payment Terms Templates
CREATE TABLE IF NOT EXISTS public.payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  term_name VARCHAR(100) NOT NULL,
  description TEXT,
  due_days INTEGER DEFAULT 30,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_days INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  so_number VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  payment_terms_id UUID REFERENCES public.payment_terms(id),
  shipping_address TEXT,
  billing_address TEXT,
  status VARCHAR(30) DEFAULT 'draft',
  subtotal DECIMAL(18,2) DEFAULT 0,
  tax_amount DECIMAL(18,2) DEFAULT 0,
  discount_amount DECIMAL(18,2) DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sales_orders_so_number_company_unique UNIQUE (so_number, company_id)
);

-- Sales Order Lines
CREATE TABLE IF NOT EXISTS public.sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  description TEXT,
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(18,2) DEFAULT 0,
  line_total DECIMAL(18,2) NOT NULL,
  delivered_qty DECIMAL(18,4) DEFAULT 0,
  invoiced_qty DECIMAL(18,4) DEFAULT 0,
  warehouse_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery Notes
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  dn_number VARCHAR(50) NOT NULL,
  sales_order_id UUID REFERENCES public.sales_orders(id),
  customer_id UUID REFERENCES public.customers(id),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shipping_address TEXT,
  driver_name VARCHAR(100),
  vehicle_number VARCHAR(50),
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT delivery_notes_dn_number_company_unique UNIQUE (dn_number, company_id)
);

-- Delivery Note Lines
CREATE TABLE IF NOT EXISTS public.delivery_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  so_line_id UUID REFERENCES public.sales_order_lines(id),
  item_id UUID REFERENCES public.items(id),
  quantity DECIMAL(18,4) NOT NULL,
  warehouse_id UUID,
  batch_number VARCHAR(50),
  serial_numbers TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Phase 2: Procurement Enhancements
-- =====================================================

-- Request for Quotation
CREATE TABLE IF NOT EXISTS public.request_for_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  rfq_number VARCHAR(50) NOT NULL,
  requisition_id UUID REFERENCES public.purchase_requisitions(id),
  rfq_date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_deadline DATE,
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT rfq_number_company_unique UNIQUE (rfq_number, company_id)
);

-- RFQ Vendors (which vendors receive the RFQ)
CREATE TABLE IF NOT EXISTS public.rfq_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES public.request_for_quotations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id),
  sent_date TIMESTAMPTZ,
  response_received BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RFQ Lines
CREATE TABLE IF NOT EXISTS public.rfq_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES public.request_for_quotations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  description TEXT,
  quantity DECIMAL(18,4) NOT NULL,
  uom VARCHAR(20),
  target_warehouse_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Supplier Quotations
CREATE TABLE IF NOT EXISTS public.supplier_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  sq_number VARCHAR(50) NOT NULL,
  rfq_id UUID REFERENCES public.request_for_quotations(id),
  vendor_id UUID REFERENCES public.vendors(id),
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  total_amount DECIMAL(18,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'LKR',
  status VARCHAR(30) DEFAULT 'received',
  is_selected BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sq_number_company_unique UNIQUE (sq_number, company_id)
);

-- Supplier Quotation Lines
CREATE TABLE IF NOT EXISTS public.supplier_quotation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES public.supplier_quotations(id) ON DELETE CASCADE,
  rfq_line_id UUID REFERENCES public.rfq_lines(id),
  item_id UUID REFERENCES public.items(id),
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL,
  lead_time_days INTEGER,
  line_total DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Phase 3: Inventory Enhancements
-- =====================================================

-- Pick Lists
CREATE TABLE IF NOT EXISTS public.pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  pick_number VARCHAR(50) NOT NULL,
  sales_order_id UUID REFERENCES public.sales_orders(id),
  warehouse_id UUID,
  status VARCHAR(30) DEFAULT 'draft',
  picked_by UUID,
  picked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pick_number_company_unique UNIQUE (pick_number, company_id)
);

-- Pick List Lines
CREATE TABLE IF NOT EXISTS public.pick_list_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id UUID REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  so_line_id UUID REFERENCES public.sales_order_lines(id),
  item_id UUID REFERENCES public.items(id),
  bin_location VARCHAR(50),
  qty_to_pick DECIMAL(18,4) NOT NULL,
  qty_picked DECIMAL(18,4) DEFAULT 0,
  serial_numbers TEXT[],
  batch_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Landed Cost Vouchers
CREATE TABLE IF NOT EXISTS public.landed_cost_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  voucher_number VARCHAR(50) NOT NULL,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  grn_id UUID REFERENCES public.goods_receipt_notes(id),
  total_additional_cost DECIMAL(18,2) DEFAULT 0,
  allocation_method VARCHAR(30) DEFAULT 'by_value',
  status VARCHAR(30) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT lcv_number_company_unique UNIQUE (voucher_number, company_id)
);

-- Landed Cost Items
CREATE TABLE IF NOT EXISTS public.landed_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.landed_cost_vouchers(id) ON DELETE CASCADE,
  grn_line_id UUID,
  item_id UUID REFERENCES public.items(id),
  original_cost DECIMAL(18,4) NOT NULL,
  allocated_cost DECIMAL(18,4) DEFAULT 0,
  final_cost DECIMAL(18,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Landed Cost Charges
CREATE TABLE IF NOT EXISTS public.landed_cost_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.landed_cost_vouchers(id) ON DELETE CASCADE,
  charge_type VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(18,2) NOT NULL,
  expense_account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unit of Measures
CREATE TABLE IF NOT EXISTS public.unit_of_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  uom_name VARCHAR(50) NOT NULL,
  uom_symbol VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uom_name_company_unique UNIQUE (uom_name, company_id)
);

-- UoM Conversions
CREATE TABLE IF NOT EXISTS public.uom_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  item_id UUID REFERENCES public.items(id),
  from_uom VARCHAR(50) NOT NULL,
  to_uom VARCHAR(50) NOT NULL,
  conversion_factor DECIMAL(18,6) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uom_conversion_unique UNIQUE (item_id, from_uom, to_uom)
);

-- =====================================================
-- Phase 4: Quality Management
-- =====================================================

-- Inspection Templates
CREATE TABLE IF NOT EXISTS public.inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  template_name VARCHAR(100) NOT NULL,
  template_code VARCHAR(50),
  inspection_type VARCHAR(30) DEFAULT 'incoming',
  applicable_to VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inspection Template Criteria
CREATE TABLE IF NOT EXISTS public.inspection_template_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.inspection_templates(id) ON DELETE CASCADE,
  criteria_name VARCHAR(100) NOT NULL,
  criteria_type VARCHAR(30) DEFAULT 'pass_fail',
  acceptance_criteria TEXT,
  min_value DECIMAL(18,4),
  max_value DECIMAL(18,4),
  is_mandatory BOOLEAN DEFAULT true,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quality Inspections
CREATE TABLE IF NOT EXISTS public.quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  inspection_number VARCHAR(50) NOT NULL,
  template_id UUID REFERENCES public.inspection_templates(id),
  reference_type VARCHAR(30),
  reference_id UUID,
  item_id UUID REFERENCES public.items(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspected_qty DECIMAL(18,4) NOT NULL,
  accepted_qty DECIMAL(18,4) DEFAULT 0,
  rejected_qty DECIMAL(18,4) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  inspector_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT inspection_number_company_unique UNIQUE (inspection_number, company_id)
);

-- Quality Inspection Readings
CREATE TABLE IF NOT EXISTS public.quality_inspection_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.quality_inspections(id) ON DELETE CASCADE,
  criteria_id UUID REFERENCES public.inspection_template_criteria(id),
  reading_value TEXT,
  numeric_value DECIMAL(18,4),
  status VARCHAR(30) DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Phase 5: Asset Maintenance
-- =====================================================

-- Asset Maintenance Teams
CREATE TABLE IF NOT EXISTS public.asset_maintenance_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  team_name VARCHAR(100) NOT NULL,
  team_code VARCHAR(50),
  team_members TEXT[],
  team_lead VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asset Maintenance Logs
CREATE TABLE IF NOT EXISTS public.asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  asset_id UUID REFERENCES public.fixed_assets(id),
  maintenance_number VARCHAR(50),
  maintenance_type VARCHAR(30) DEFAULT 'preventive',
  maintenance_date DATE NOT NULL,
  next_due_date DATE,
  assigned_team_id UUID REFERENCES public.asset_maintenance_teams(id),
  assigned_to VARCHAR(100),
  description TEXT,
  cost DECIMAL(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'scheduled',
  priority VARCHAR(20) DEFAULT 'medium',
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Enable RLS on all new tables
-- =====================================================

ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_for_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landed_cost_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_of_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uom_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_template_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspection_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Allow all for authenticated users
-- =====================================================

-- Payment Terms
CREATE POLICY "Allow all for authenticated users" ON public.payment_terms FOR ALL USING (auth.role() = 'authenticated');

-- Sales Orders
CREATE POLICY "Allow all for authenticated users" ON public.sales_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.sales_order_lines FOR ALL USING (auth.role() = 'authenticated');

-- Delivery Notes
CREATE POLICY "Allow all for authenticated users" ON public.delivery_notes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.delivery_note_lines FOR ALL USING (auth.role() = 'authenticated');

-- RFQ
CREATE POLICY "Allow all for authenticated users" ON public.request_for_quotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.rfq_vendors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.rfq_lines FOR ALL USING (auth.role() = 'authenticated');

-- Supplier Quotations
CREATE POLICY "Allow all for authenticated users" ON public.supplier_quotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.supplier_quotation_lines FOR ALL USING (auth.role() = 'authenticated');

-- Pick Lists
CREATE POLICY "Allow all for authenticated users" ON public.pick_lists FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.pick_list_lines FOR ALL USING (auth.role() = 'authenticated');

-- Landed Cost
CREATE POLICY "Allow all for authenticated users" ON public.landed_cost_vouchers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.landed_cost_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.landed_cost_charges FOR ALL USING (auth.role() = 'authenticated');

-- UoM
CREATE POLICY "Allow all for authenticated users" ON public.unit_of_measures FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.uom_conversions FOR ALL USING (auth.role() = 'authenticated');

-- Quality
CREATE POLICY "Allow all for authenticated users" ON public.inspection_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.inspection_template_criteria FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.quality_inspections FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.quality_inspection_readings FOR ALL USING (auth.role() = 'authenticated');

-- Asset Maintenance
CREATE POLICY "Allow all for authenticated users" ON public.asset_maintenance_teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.asset_maintenance_logs FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON public.sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_so ON public.delivery_notes(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer ON public.delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_rfq_status ON public.request_for_quotations(status);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_vendor ON public.supplier_quotations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotations_rfq ON public.supplier_quotations(rfq_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_so ON public.pick_lists(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON public.quality_inspections(status);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON public.asset_maintenance_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_status ON public.asset_maintenance_logs(status);