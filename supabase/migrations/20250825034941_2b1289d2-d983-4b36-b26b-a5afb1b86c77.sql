-- Create staff_performance table for driver and conductor performance tracking
CREATE TABLE IF NOT EXISTS public.staff_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  role TEXT CHECK (role IN ('driver', 'conductor', 'both')) DEFAULT 'driver',
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view staff performance" 
ON public.staff_performance 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage staff performance" 
ON public.staff_performance 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_staff_performance_updated_at
BEFORE UPDATE ON public.staff_performance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();