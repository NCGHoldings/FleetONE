
-- Fleet Master Roster table for NCG Express operations
CREATE TABLE public.fleet_master_roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  route_label TEXT,
  bus_type TEXT DEFAULT 'Normal',
  permit_type TEXT DEFAULT 'Normal',
  route_start_date DATE,
  trips_per_day INTEGER NOT NULL DEFAULT 1,
  default_driver TEXT,
  default_conductor TEXT,
  day_target NUMERIC DEFAULT 0,
  remark TEXT DEFAULT 'Running',
  section TEXT DEFAULT 'OLD RUNNING ROUTES',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  turn_01_time TEXT,
  turn_02_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bus_id)
);

-- Enable RLS
ALTER TABLE public.fleet_master_roster ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view fleet roster"
  ON public.fleet_master_roster FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fleet roster"
  ON public.fleet_master_roster FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fleet roster"
  ON public.fleet_master_roster FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fleet roster"
  ON public.fleet_master_roster FOR DELETE
  TO authenticated USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_fleet_master_roster_updated_at
  BEFORE UPDATE ON public.fleet_master_roster
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_updated_at();
