-- Create Yutong Quotations table (bus_models table already exists)
CREATE TABLE public.yutong_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  company_name TEXT,
  bus_model_id UUID REFERENCES public.yutong_bus_models(id),
  bus_model TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_percentage NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  special_features TEXT,
  delivery_timeline TEXT,
  payment_terms TEXT,
  warranty_terms TEXT,
  valid_days INTEGER NOT NULL DEFAULT 30,
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for yutong_quotations
ALTER TABLE public.yutong_quotations ENABLE ROW LEVEL SECURITY;

-- Create policies for yutong_quotations
CREATE POLICY "All authenticated users can view quotations" 
ON public.yutong_quotations 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage quotations" 
ON public.yutong_quotations 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create trigger for automatic timestamp updates on yutong_quotations  
CREATE TRIGGER update_yutong_quotations_updated_at
BEFORE UPDATE ON public.yutong_quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();