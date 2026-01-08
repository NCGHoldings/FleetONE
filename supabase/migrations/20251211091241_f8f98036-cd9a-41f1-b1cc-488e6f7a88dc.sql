-- Create executive KPI targets table for configurable dashboard targets
CREATE TABLE public.executive_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_key TEXT UNIQUE NOT NULL,
  kpi_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  min_acceptable NUMERIC,
  max_value NUMERIC,
  unit TEXT DEFAULT 'number',
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.executive_kpi_targets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage KPI targets" ON public.executive_kpi_targets
FOR ALL USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

CREATE POLICY "Authenticated users can view KPI targets" ON public.executive_kpi_targets
FOR SELECT USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE TRIGGER update_executive_kpi_targets_updated_at
  BEFORE UPDATE ON public.executive_kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default KPI targets
INSERT INTO public.executive_kpi_targets (kpi_key, kpi_name, target_value, min_acceptable, unit, category, display_order) VALUES
  ('monthly_revenue', 'Monthly Revenue', 5000000, 4000000, 'currency', 'financial', 1),
  ('net_profit', 'Net Profit', 1000000, 800000, 'currency', 'financial', 2),
  ('profit_margin', 'Profit Margin', 25, 20, 'percentage', 'financial', 3),
  ('fleet_utilization', 'Fleet Utilization', 85, 75, 'percentage', 'fleet', 4),
  ('daily_trips', 'Daily Trips Target', 30, 25, 'number', 'operations', 5),
  ('fuel_efficiency', 'Fuel Efficiency (km/L)', 12, 10, 'number', 'efficiency', 6),
  ('completion_rate', 'Trip Completion Rate', 95, 90, 'percentage', 'operations', 7),
  ('total_distance', 'Monthly Distance (km)', 50000, 40000, 'km', 'operations', 8);