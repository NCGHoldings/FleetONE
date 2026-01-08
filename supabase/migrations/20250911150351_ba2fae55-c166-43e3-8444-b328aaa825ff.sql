-- Create table for individual bus details in multi-parking quotations
CREATE TABLE public.quotation_bus_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  bus_number INTEGER NOT NULL,
  parking_location_id UUID REFERENCES public.fuel_settings(id),
  parking_location_name TEXT,
  parking_lat NUMERIC,
  parking_lng NUMERIC,
  km_parking_to_pickup NUMERIC DEFAULT 0,
  km_drop_to_parking NUMERIC DEFAULT 0,
  fuel_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotation_bus_details ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view bus details" 
ON public.quotation_bus_details 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Staff can manage bus details" 
ON public.quotation_bus_details 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_quotation_bus_details_updated_at
BEFORE UPDATE ON public.quotation_bus_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_quotation_bus_details_quotation_id ON public.quotation_bus_details(quotation_id);

-- Add flag to special_hire_quotations to indicate multi-parking mode
ALTER TABLE public.special_hire_quotations 
ADD COLUMN uses_multi_parking BOOLEAN DEFAULT false;