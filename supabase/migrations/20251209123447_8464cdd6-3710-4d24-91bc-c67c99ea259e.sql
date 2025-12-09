-- Create API usage logs table for monitoring Google API calls
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_name TEXT NOT NULL, -- 'places_autocomplete', 'geocoding', 'directions', 'place_details'
  endpoint TEXT,
  query_text TEXT,
  cache_hit BOOLEAN DEFAULT false,
  response_status TEXT,
  estimated_cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for efficient querying
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_api_name ON public.api_usage_logs(api_name);
CREATE INDEX idx_api_usage_logs_cache_hit ON public.api_usage_logs(cache_hit);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view API usage logs
CREATE POLICY "Admins can view API usage logs"
  ON public.api_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- System can insert logs (via service role)
CREATE POLICY "System can insert API usage logs"
  ON public.api_usage_logs
  FOR INSERT
  WITH CHECK (true);