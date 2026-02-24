-- Phase 1: Order Management & Financial Foundation

-- Create enum types for order and payment management
CREATE TYPE yutong_order_phase AS ENUM (
  'order_confirmation', 
  'lc_issuance', 
  'production_order', 
  'manufacturing', 
  'shipping_booking', 
  'customs_clearance', 
  'port_operations', 
  'vehicle_processing', 
  'rmv_registration', 
  'final_inspection', 
  'delivery'
);

CREATE TYPE yutong_payment_mode AS ENUM ('cash', 'lease');
CREATE TYPE yutong_payment_type AS ENUM ('advance', 'interim', 'balance', 'full');
CREATE TYPE yutong_payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE yutong_lc_status AS ENUM ('pending', 'issued', 'amended', 'utilized', 'closed', 'cancelled');
CREATE TYPE yutong_do_status AS ENUM ('pending', 'issued', 'released', 'utilized');

-- Create Orders table - converts quotations to formal orders
CREATE TABLE public.yutong_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  quotation_id UUID NOT NULL REFERENCES public.yutong_quotations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.yutong_customers(id),
  
  -- Order specifications
  bus_model TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  
  -- Detailed specifications
  engine_type TEXT,
  gearbox_type TEXT,
  seating_capacity INTEGER,
  color_scheme TEXT,
  special_features JSONB DEFAULT '[]'::jsonb,
  
  -- Payment details
  payment_mode yutong_payment_mode NOT NULL DEFAULT 'cash',
  payment_structure JSONB, -- For cash: {advance: 10, interim: 40, balance: 50}
  
  -- Order lifecycle
  current_phase yutong_order_phase NOT NULL DEFAULT 'order_confirmation',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Status and progress
  status TEXT NOT NULL DEFAULT 'confirmed',
  progress_percentage NUMERIC DEFAULT 0,
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Financial summary (calculated fields)
  total_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0
);

-- Create Payment Schedules table for milestone-based payments
CREATE TABLE public.yutong_payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  
  -- Payment details
  milestone_name TEXT NOT NULL, -- e.g., "Order Confirmation Advance", "LC Issuance", "Balance Payment"
  payment_type yutong_payment_type NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  
  -- Status tracking
  status yutong_payment_status NOT NULL DEFAULT 'pending',
  payment_date DATE,
  payment_reference TEXT,
  payment_method TEXT, -- bank_transfer, cheque, etc.
  
  -- Bank details for LC payments
  bank_name TEXT,
  bank_branch TEXT,
  
  -- Metadata
  sequence_order INTEGER NOT NULL DEFAULT 1,
  is_lc_payment BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Letter of Credit Management table
CREATE TABLE public.yutong_letter_of_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lc_no TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  
  -- Bank details
  issuing_bank_name TEXT NOT NULL,
  issuing_bank_branch TEXT,
  issuing_bank_contact TEXT,
  beneficiary_bank TEXT DEFAULT 'Yutong Bus Co., Ltd',
  
  -- LC details
  lc_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  lc_type TEXT NOT NULL DEFAULT 'Irrevocable Documentary Credit',
  
  -- Important dates
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  latest_shipment_date DATE,
  
  -- Documents required
  required_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Status and amendments
  status yutong_lc_status NOT NULL DEFAULT 'pending',
  amendment_count INTEGER DEFAULT 0,
  amendments JSONB DEFAULT '[]'::jsonb,
  
  -- Utilization tracking
  utilized_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Delivery Orders table for bank DO management
CREATE TABLE public.yutong_delivery_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  do_no TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  lc_id UUID REFERENCES public.yutong_letter_of_credits(id),
  
  -- Bank and DO details
  issuing_bank TEXT NOT NULL,
  do_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Vehicle details for DO
  chassis_numbers JSONB DEFAULT '[]'::jsonb,
  engine_numbers JSONB DEFAULT '[]'::jsonb,
  vehicle_count INTEGER NOT NULL DEFAULT 1,
  
  -- Status and dates
  status yutong_do_status NOT NULL DEFAULT 'pending',
  issue_date DATE,
  release_date DATE,
  collection_date DATE,
  
  -- Document references
  commercial_invoice_no TEXT,
  bill_of_lading_no TEXT,
  packing_list_no TEXT,
  
  -- Metadata
  notes TEXT,
  collected_by TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Customer Payments table for tracking actual payments
CREATE TABLE public.yutong_customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.yutong_orders(id) ON DELETE CASCADE,
  payment_schedule_id UUID REFERENCES public.yutong_payment_schedules(id),
  
  -- Payment details
  payment_amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  
  -- Bank details
  bank_name TEXT,
  cheque_no TEXT,
  bank_slip_no TEXT,
  
  -- Status and verification
  status TEXT NOT NULL DEFAULT 'received',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- File attachments
  payment_slip_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_yutong_orders_quotation_id ON public.yutong_orders(quotation_id);
CREATE INDEX idx_yutong_orders_current_phase ON public.yutong_orders(current_phase);
CREATE INDEX idx_yutong_orders_status ON public.yutong_orders(status);
CREATE INDEX idx_yutong_orders_order_date ON public.yutong_orders(order_date);

CREATE INDEX idx_yutong_payment_schedules_order_id ON public.yutong_payment_schedules(order_id);
CREATE INDEX idx_yutong_payment_schedules_status ON public.yutong_payment_schedules(status);
CREATE INDEX idx_yutong_payment_schedules_due_date ON public.yutong_payment_schedules(due_date);

CREATE INDEX idx_yutong_lc_order_id ON public.yutong_letter_of_credits(order_id);
CREATE INDEX idx_yutong_lc_status ON public.yutong_letter_of_credits(status);
CREATE INDEX idx_yutong_lc_expiry_date ON public.yutong_letter_of_credits(expiry_date);

CREATE INDEX idx_yutong_do_order_id ON public.yutong_delivery_orders(order_id);
CREATE INDEX idx_yutong_do_lc_id ON public.yutong_delivery_orders(lc_id);
CREATE INDEX idx_yutong_do_status ON public.yutong_delivery_orders(status);

CREATE INDEX idx_yutong_customer_payments_order_id ON public.yutong_customer_payments(order_id);
CREATE INDEX idx_yutong_customer_payments_schedule_id ON public.yutong_customer_payments(payment_schedule_id);

-- Enable Row Level Security
ALTER TABLE public.yutong_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_letter_of_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_customer_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All authenticated users can view orders" ON public.yutong_orders FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Staff can manage orders" ON public.yutong_orders FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "All authenticated users can view payment schedules" ON public.yutong_payment_schedules FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Staff can manage payment schedules" ON public.yutong_payment_schedules FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "All authenticated users can view LCs" ON public.yutong_letter_of_credits FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Finance staff can manage LCs" ON public.yutong_letter_of_credits FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "All authenticated users can view DOs" ON public.yutong_delivery_orders FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Finance staff can manage DOs" ON public.yutong_delivery_orders FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "All authenticated users can view customer payments" ON public.yutong_customer_payments FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Staff can manage customer payments" ON public.yutong_customer_payments FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

-- Create auto-update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_yutong_orders_updated_at BEFORE UPDATE ON public.yutong_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yutong_payment_schedules_updated_at BEFORE UPDATE ON public.yutong_payment_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yutong_lc_updated_at BEFORE UPDATE ON public.yutong_letter_of_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yutong_do_updated_at BEFORE UPDATE ON public.yutong_delivery_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yutong_customer_payments_updated_at BEFORE UPDATE ON public.yutong_customer_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_yutong_order_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_order_seq');
  RETURN 'YTO-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$$;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS public.yutong_order_seq START 1;

-- Function to auto-generate order number
CREATE OR REPLACE FUNCTION public.set_yutong_order_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no = public.generate_yutong_order_no();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating order numbers
CREATE TRIGGER set_yutong_order_no_trigger
  BEFORE INSERT ON public.yutong_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yutong_order_no();

-- Function to update order financial summary when payments change
CREATE OR REPLACE FUNCTION update_yutong_order_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update order totals when payments change
  UPDATE public.yutong_orders 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.yutong_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status = 'received'
    ),
    balance_due = total_amount - (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.yutong_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status = 'received'
    )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update order financials
CREATE TRIGGER update_order_financials_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.yutong_customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_yutong_order_financials();