-- Create the yutong_bus_models table
CREATE TABLE IF NOT EXISTS public.yutong_bus_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  engine TEXT,
  manufactured_year INTEGER,
  condition TEXT DEFAULT 'new',
  base_price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.yutong_bus_models ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "All authenticated users can view bus models"
ON public.yutong_bus_models
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage bus models"
ON public.yutong_bus_models
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_yutong_bus_models_updated_at
BEFORE UPDATE ON public.yutong_bus_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();