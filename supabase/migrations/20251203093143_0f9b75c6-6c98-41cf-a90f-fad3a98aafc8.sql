-- Create bus_api_connections table for per-bus API integration
CREATE TABLE public.bus_api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
  bus_no TEXT NOT NULL,
  api_name TEXT NOT NULL DEFAULT 'Custom',
  api_endpoint TEXT NOT NULL,
  api_key TEXT,
  api_auth_type TEXT DEFAULT 'api_key', -- 'api_key', 'bearer', 'basic', 'none'
  device_identifier TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Auto-discovered schema
  discovered_schema JSONB,
  field_mappings JSONB,
  
  -- Sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- 'success', 'failed', 'partial'
  last_error_message TEXT,
  sync_interval_seconds INTEGER DEFAULT 60,
  
  -- Pattern learning
  learned_patterns JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(bus_id)
);

-- Enable RLS
ALTER TABLE public.bus_api_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Admins can manage bus API connections" ON public.bus_api_connections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Create policy for supervisors to view
CREATE POLICY "Supervisors can view bus API connections" ON public.bus_api_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'supervisor')
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_bus_api_connections_updated_at
  BEFORE UPDATE ON public.bus_api_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for fast lookups
CREATE INDEX idx_bus_api_connections_bus_id ON public.bus_api_connections(bus_id);
CREATE INDEX idx_bus_api_connections_is_active ON public.bus_api_connections(is_active);