-- Create vehicle_inquiries table
CREATE TABLE IF NOT EXISTS public.vehicle_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('website', 'phone', 'whatsapp', 'walk-in', 'referral', 'other')),
  product_type TEXT NOT NULL CHECK (product_type IN ('yutong', 'sinotruck', 'both')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  company_name TEXT,
  address TEXT,
  inquiry_message TEXT,
  interested_model TEXT,
  quantity INTEGER DEFAULT 1,
  budget_range TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  follow_up_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  external_ref_id TEXT,
  converted_to_quotation_id UUID,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inquiry_follow_ups table
CREATE TABLE IF NOT EXISTS public.inquiry_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.vehicle_inquiries(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('call', 'email', 'whatsapp', 'meeting', 'note')),
  notes TEXT NOT NULL,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inquiry_hub_settings table
CREATE TABLE IF NOT EXISTS public.inquiry_hub_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for inquiry numbers
CREATE SEQUENCE IF NOT EXISTS public.inquiry_number_seq START 1;

-- Function to generate inquiry number
CREATE OR REPLACE FUNCTION public.generate_inquiry_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.inquiry_number_seq');
  RETURN 'INQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-generate inquiry number
CREATE OR REPLACE FUNCTION public.set_inquiry_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.inquiry_number IS NULL OR NEW.inquiry_number = '' THEN
    NEW.inquiry_number = public.generate_inquiry_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_inquiry_number_trigger
BEFORE INSERT ON public.vehicle_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.set_inquiry_number();

-- Trigger for updated_at
CREATE TRIGGER update_vehicle_inquiries_updated_at
BEFORE UPDATE ON public.vehicle_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inquiry_hub_settings_updated_at
BEFORE UPDATE ON public.inquiry_hub_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inquiries_status ON public.vehicle_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_inquiries_product_type ON public.vehicle_inquiries(product_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_inquiries_assigned_to ON public.vehicle_inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_vehicle_inquiries_created_at ON public.vehicle_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiry_follow_ups_inquiry_id ON public.inquiry_follow_ups(inquiry_id);

-- RLS Policies for vehicle_inquiries
ALTER TABLE public.vehicle_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view inquiries"
ON public.vehicle_inquiries
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage inquiries"
ON public.vehicle_inquiries
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- RLS Policies for inquiry_follow_ups
ALTER TABLE public.inquiry_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view follow-ups"
ON public.inquiry_follow_ups
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage follow-ups"
ON public.inquiry_follow_ups
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- RLS Policies for inquiry_hub_settings
ALTER TABLE public.inquiry_hub_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view settings"
ON public.inquiry_hub_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.inquiry_hub_settings
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Insert default settings
INSERT INTO public.inquiry_hub_settings (setting_key, setting_value)
VALUES 
  ('webhook_secret', '{"api_key": ""}'::jsonb),
  ('external_website_url', '{"url": ""}'::jsonb),
  ('whatsapp_link', '{"url": ""}'::jsonb),
  ('auto_assign_enabled', '{"enabled": false}'::jsonb),
  ('default_assignees', '{"yutong": null, "sinotruck": null}'::jsonb),
  ('notification_settings', '{"email_enabled": false, "whatsapp_enabled": false}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;