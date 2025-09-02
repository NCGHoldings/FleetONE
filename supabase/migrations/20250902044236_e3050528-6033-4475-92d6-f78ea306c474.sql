-- Create Yutong Add-ons table
CREATE TABLE public.yutong_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_name TEXT NOT NULL,
  addon_code TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  installation_time_hours NUMERIC DEFAULT 1,
  warranty_months INTEGER DEFAULT 12,
  supplier_name TEXT,
  supplier_contact TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.yutong_addons ENABLE ROW LEVEL SECURITY;

-- Create policies for yutong_addons
CREATE POLICY "All authenticated users can view addons" 
ON public.yutong_addons 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage addons" 
ON public.yutong_addons 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_yutong_addons_updated_at
BEFORE UPDATE ON public.yutong_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();