-- Phase 4: Delivery & After-Sales Tables and Infrastructure

-- Enums for delivery and after-sales operations
DO $$ BEGIN
    CREATE TYPE public.inspection_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.handover_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.delivery_status AS ENUM ('pending', 'scheduled', 'in_transit', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.warranty_status AS ENUM ('active', 'expired', 'claimed', 'void');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'pending_customer', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feedback_rating AS ENUM ('1', '2', '3', '4', '5');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Delivery Inspections Table
CREATE TABLE IF NOT EXISTS public.yutong_delivery_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspector_name TEXT NOT NULL,
    inspector_id UUID,
    status inspection_status DEFAULT 'pending',
    checklist_items JSONB DEFAULT '[]'::jsonb,
    defects_found JSONB DEFAULT '[]'::jsonb,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Handovers Table
CREATE TABLE IF NOT EXISTS public.yutong_customer_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    handover_date DATE NOT NULL,
    handover_time TIME,
    location TEXT NOT NULL,
    status handover_status DEFAULT 'scheduled',
    handover_officer_name TEXT NOT NULL,
    handover_officer_id UUID,
    customer_representative_name TEXT,
    customer_representative_contact TEXT,
    documents_provided JSONB DEFAULT '[]'::jsonb,
    training_provided BOOLEAN DEFAULT false,
    training_duration_hours NUMERIC,
    training_notes TEXT,
    customer_signature TEXT,
    officer_signature TEXT,
    handover_photos JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Delivery Confirmations Table
CREATE TABLE IF NOT EXISTS public.yutong_delivery_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time TIME,
    delivery_location TEXT NOT NULL,
    status delivery_status DEFAULT 'pending',
    driver_name TEXT,
    driver_contact TEXT,
    vehicle_condition_on_delivery TEXT,
    delivery_photos JSONB DEFAULT '[]'::jsonb,
    customer_signature TEXT,
    delivery_receipt_url TEXT,
    special_instructions TEXT,
    confirmed_by UUID,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Warranties Table
CREATE TABLE IF NOT EXISTS public.yutong_warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    warranty_number TEXT UNIQUE NOT NULL,
    warranty_type TEXT NOT NULL, -- 'comprehensive', 'engine', 'transmission', etc.
    coverage_details TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_months INTEGER NOT NULL,
    mileage_limit_km INTEGER,
    status warranty_status DEFAULT 'active',
    terms_and_conditions TEXT,
    exclusions TEXT,
    claim_process TEXT,
    service_provider TEXT,
    contact_information JSONB,
    warranty_certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Service Reminders Table
CREATE TABLE IF NOT EXISTS public.yutong_service_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    warranty_id UUID,
    reminder_type TEXT NOT NULL, -- 'first_service', 'periodic_service', 'warranty_expiry'
    due_date DATE NOT NULL,
    due_mileage_km INTEGER,
    service_description TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    customer_contacted BOOLEAN DEFAULT false,
    customer_contacted_at TIMESTAMP WITH TIME ZONE,
    service_booked BOOLEAN DEFAULT false,
    service_booked_at TIMESTAMP WITH TIME ZONE,
    service_completed BOOLEAN DEFAULT false,
    service_completed_at TIMESTAMP WITH TIME ZONE,
    next_reminder_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS public.yutong_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL,
    order_id UUID,
    warranty_id UUID,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'technical', 'warranty', 'parts', 'service'
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    assigned_to UUID,
    assigned_to_name TEXT,
    customer_contact_email TEXT,
    customer_contact_phone TEXT,
    resolution TEXT,
    resolution_time_hours NUMERIC,
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
    attachments JSONB DEFAULT '[]'::jsonb,
    internal_notes TEXT,
    customer_notes TEXT,
    escalated BOOLEAN DEFAULT false,
    escalated_to UUID,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS public.yutong_customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    order_id UUID,
    feedback_type TEXT NOT NULL, -- 'delivery', 'product', 'service', 'general'
    overall_rating feedback_rating NOT NULL,
    product_quality_rating feedback_rating,
    delivery_experience_rating feedback_rating,
    customer_service_rating feedback_rating,
    value_for_money_rating feedback_rating,
    likelihood_to_recommend INTEGER CHECK (likelihood_to_recommend >= 1 AND likelihood_to_recommend <= 10),
    comments TEXT,
    positive_aspects TEXT,
    areas_for_improvement TEXT,
    would_purchase_again BOOLEAN,
    feedback_channel TEXT, -- 'email', 'phone', 'website', 'survey'
    responded_to BOOLEAN DEFAULT false,
    response_date TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sequences for auto-generated numbers
CREATE SEQUENCE IF NOT EXISTS public.yutong_warranty_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.yutong_ticket_seq START 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_inspections_order_id ON public.yutong_delivery_inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_inspections_status ON public.yutong_delivery_inspections(status);
CREATE INDEX IF NOT EXISTS idx_delivery_inspections_date ON public.yutong_delivery_inspections(inspection_date);

CREATE INDEX IF NOT EXISTS idx_customer_handovers_order_id ON public.yutong_customer_handovers(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_handovers_customer_id ON public.yutong_customer_handovers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_handovers_status ON public.yutong_customer_handovers(status);
CREATE INDEX IF NOT EXISTS idx_customer_handovers_date ON public.yutong_customer_handovers(handover_date);

CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_order_id ON public.yutong_delivery_confirmations(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_status ON public.yutong_delivery_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_date ON public.yutong_delivery_confirmations(delivery_date);

CREATE INDEX IF NOT EXISTS idx_warranties_order_id ON public.yutong_warranties(order_id);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON public.yutong_warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON public.yutong_warranties(end_date);

CREATE INDEX IF NOT EXISTS idx_service_reminders_order_id ON public.yutong_service_reminders(order_id);
CREATE INDEX IF NOT EXISTS idx_service_reminders_due_date ON public.yutong_service_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_service_reminders_type ON public.yutong_service_reminders(reminder_type);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.yutong_support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON public.yutong_support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.yutong_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.yutong_support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.yutong_support_tickets(assigned_to);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON public.yutong_customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_order_id ON public.yutong_customer_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON public.yutong_customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON public.yutong_customer_feedback(overall_rating);

-- Functions for auto-generating numbers
CREATE OR REPLACE FUNCTION public.generate_yutong_warranty_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_warranty_seq');
  RETURN 'YTW-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_yutong_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_ticket_seq');
  RETURN 'YTT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

-- Triggers for auto-generating numbers
CREATE OR REPLACE FUNCTION public.set_yutong_warranty_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.warranty_number IS NULL OR NEW.warranty_number = '' THEN
    NEW.warranty_number = public.generate_yutong_warranty_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_yutong_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number = public.generate_yutong_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS set_warranty_number_trigger ON public.yutong_warranties;
CREATE TRIGGER set_warranty_number_trigger
  BEFORE INSERT ON public.yutong_warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yutong_warranty_number();

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON public.yutong_support_tickets;
CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.yutong_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yutong_ticket_number();

-- Triggers for updating timestamps
DROP TRIGGER IF EXISTS update_delivery_inspections_updated_at ON public.yutong_delivery_inspections;
CREATE TRIGGER update_delivery_inspections_updated_at
  BEFORE UPDATE ON public.yutong_delivery_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_handovers_updated_at ON public.yutong_customer_handovers;
CREATE TRIGGER update_customer_handovers_updated_at
  BEFORE UPDATE ON public.yutong_customer_handovers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_confirmations_updated_at ON public.yutong_delivery_confirmations;
CREATE TRIGGER update_delivery_confirmations_updated_at
  BEFORE UPDATE ON public.yutong_delivery_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_warranties_updated_at ON public.yutong_warranties;
CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON public.yutong_warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_reminders_updated_at ON public.yutong_service_reminders;
CREATE TRIGGER update_service_reminders_updated_at
  BEFORE UPDATE ON public.yutong_service_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.yutong_support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.yutong_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_feedback_updated_at ON public.yutong_customer_feedback;
CREATE TRIGGER update_customer_feedback_updated_at
  BEFORE UPDATE ON public.yutong_customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.yutong_delivery_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_customer_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_service_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yutong_customer_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Delivery Inspections
CREATE POLICY "All authenticated users can view delivery inspections" ON public.yutong_delivery_inspections
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage delivery inspections" ON public.yutong_delivery_inspections
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Customer Handovers
CREATE POLICY "All authenticated users can view customer handovers" ON public.yutong_customer_handovers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customer handovers" ON public.yutong_customer_handovers
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Delivery Confirmations
CREATE POLICY "All authenticated users can view delivery confirmations" ON public.yutong_delivery_confirmations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage delivery confirmations" ON public.yutong_delivery_confirmations
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Warranties
CREATE POLICY "All authenticated users can view warranties" ON public.yutong_warranties
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage warranties" ON public.yutong_warranties
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Service Reminders
CREATE POLICY "All authenticated users can view service reminders" ON public.yutong_service_reminders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage service reminders" ON public.yutong_service_reminders
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Support Tickets
CREATE POLICY "All authenticated users can view support tickets" ON public.yutong_support_tickets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage support tickets" ON public.yutong_support_tickets
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Customer Feedback
CREATE POLICY "All authenticated users can view customer feedback" ON public.yutong_customer_feedback
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage customer feedback" ON public.yutong_customer_feedback
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );