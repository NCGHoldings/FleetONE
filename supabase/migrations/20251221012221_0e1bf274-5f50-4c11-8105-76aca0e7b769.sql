-- Create business flow logs table for tracking automated tests
CREATE TABLE public.business_flow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_category TEXT NOT NULL,
  flow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  latency_ms INTEGER,
  message TEXT,
  error_details TEXT,
  tested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_business_flow_logs_category ON public.business_flow_logs(flow_category);
CREATE INDEX idx_business_flow_logs_tested_at ON public.business_flow_logs(tested_at DESC);
CREATE INDEX idx_business_flow_logs_status ON public.business_flow_logs(status);

-- Enable RLS
ALTER TABLE public.business_flow_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and insert logs
CREATE POLICY "Allow authenticated users to read business flow logs"
ON public.business_flow_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert business flow logs"
ON public.business_flow_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow cleanup of old logs
CREATE POLICY "Allow authenticated users to delete old logs"
ON public.business_flow_logs FOR DELETE
TO authenticated
USING (tested_at < now() - interval '7 days');

-- Add comment
COMMENT ON TABLE public.business_flow_logs IS 'Automated business flow test results for proactive monitoring';