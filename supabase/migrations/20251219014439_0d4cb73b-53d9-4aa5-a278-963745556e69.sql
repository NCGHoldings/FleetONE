-- System Health Logs Table for Synthetic Monitoring
CREATE TABLE public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error', 'pending')),
  response_time_ms INTEGER,
  message TEXT,
  error_details JSONB,
  metadata JSONB,
  is_test_data BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can manage health logs
CREATE POLICY "Admins can view health logs" ON public.system_health_logs
FOR SELECT USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert health logs" ON public.system_health_logs
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete health logs" ON public.system_health_logs
FOR DELETE USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Indexes for performance
CREATE INDEX idx_health_logs_created ON public.system_health_logs(created_at DESC);
CREATE INDEX idx_health_logs_type_status ON public.system_health_logs(check_type, status);
CREATE INDEX idx_health_logs_test_data ON public.system_health_logs(is_test_data) WHERE is_test_data = false;

-- Comment for documentation
COMMENT ON TABLE public.system_health_logs IS 'Stores synthetic health check results for system monitoring dashboard';