-- Create system_flow_diagrams table for storing flow configurations
CREATE TABLE public.system_flow_diagrams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL,
  diagram_name TEXT NOT NULL DEFAULT 'Default',
  flow_config JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for default diagram per module
CREATE UNIQUE INDEX idx_system_flow_diagrams_default ON public.system_flow_diagrams (module_name) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.system_flow_diagrams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view flow diagrams" 
ON public.system_flow_diagrams 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create flow diagrams" 
ON public.system_flow_diagrams 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update flow diagrams" 
ON public.system_flow_diagrams 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete flow diagrams" 
ON public.system_flow_diagrams 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_system_flow_diagrams_updated_at
BEFORE UPDATE ON public.system_flow_diagrams
FOR EACH ROW
EXECUTE FUNCTION public.update_governance_updated_at();