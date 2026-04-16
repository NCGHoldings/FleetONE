-- Create service alert configuration table
CREATE TABLE IF NOT EXISTS public.service_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_interval_km INTEGER NOT NULL DEFAULT 3000,
  alert_threshold_km INTEGER NOT NULL DEFAULT 200,
  external_api_endpoint TEXT,
  external_api_key TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bus service alerts tracking table
CREATE TABLE IF NOT EXISTS public.bus_service_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  triggered_at_km INTEGER NOT NULL,
  next_service_km INTEGER NOT NULL,
  alert_sent_at TIMESTAMPTZ DEFAULT now(),
  external_response JSONB,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to buses table for alert tracking
ALTER TABLE public.buses 
  ADD COLUMN IF NOT EXISTS last_alert_km INTEGER,
  ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.service_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_service_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_alert_config
CREATE POLICY "Super admin and admin can view service alert config"
  ON public.service_alert_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Super admin and admin can insert service alert config"
  ON public.service_alert_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Super admin and admin can update service alert config"
  ON public.service_alert_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for bus_service_alerts
CREATE POLICY "Authenticated users can view service alerts"
  ON public.bus_service_alerts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert service alerts"
  ON public.bus_service_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admin and admin can update service alerts"
  ON public.bus_service_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_service_alert_config_updated_at
  BEFORE UPDATE ON public.service_alert_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config
INSERT INTO public.service_alert_config (service_interval_km, alert_threshold_km, is_enabled)
VALUES (3000, 200, true)
ON CONFLICT DO NOTHING;