-- Phase 3: Fuel Monitoring Tables
CREATE TABLE IF NOT EXISTS public.fuel_consumption_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  fuel_filled_liters NUMERIC(10,2),
  fuel_cost NUMERIC(10,2),
  odometer_at_fillup INTEGER,
  fuel_station TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.fuel_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'low_fuel', 'suspected_theft', 'abnormal_consumption'
  fuel_level_percent NUMERIC(5,2),
  fuel_drop_amount NUMERIC(10,2),
  odometer_reading INTEGER,
  alert_timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bus_fuel_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  fuel_level_percent NUMERIC(5,2),
  fuel_level_liters NUMERIC(10,2),
  odometer_reading INTEGER,
  reading_timestamp TIMESTAMPTZ NOT NULL,
  data_source TEXT DEFAULT 'fios', -- 'fios', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 4: Driver Behavior & Safety Tables
CREATE TABLE IF NOT EXISTS public.driver_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL, -- 'harsh_braking', 'harsh_acceleration', 'speeding', 'sharp_turn', 'excessive_idle'
  event_timestamp TIMESTAMPTZ NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  speed_kmh NUMERIC(6,2),
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  threshold_value NUMERIC(10,2), -- speed limit, g-force, etc.
  actual_value NUMERIC(10,2),
  location_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_period_start DATE NOT NULL,
  score_period_end DATE NOT NULL,
  total_score NUMERIC(5,2) DEFAULT 100.00,
  harsh_braking_count INTEGER DEFAULT 0,
  harsh_acceleration_count INTEGER DEFAULT 0,
  speeding_count INTEGER DEFAULT 0,
  sharp_turn_count INTEGER DEFAULT 0,
  excessive_idle_count INTEGER DEFAULT 0,
  total_distance_km NUMERIC(10,2) DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  safety_rating TEXT, -- 'excellent', 'good', 'fair', 'poor'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(id),
  alert_type TEXT NOT NULL, -- 'speeding', 'multiple_harsh_events', 'fatigue_warning'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  alert_message TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 5: Historical Data & Analytics Tables
CREATE TABLE IF NOT EXISTS public.gps_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed_kmh NUMERIC(6,2),
  heading INTEGER, -- 0-359 degrees
  altitude_meters NUMERIC(8,2),
  odometer_reading INTEGER,
  fuel_level_percent NUMERIC(5,2),
  timestamp TIMESTAMPTZ NOT NULL,
  data_source TEXT DEFAULT 'fios',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.completed_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(id),
  trip_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_odometer INTEGER,
  end_odometer INTEGER,
  distance_km NUMERIC(10,2),
  avg_speed_kmh NUMERIC(6,2),
  max_speed_kmh NUMERIC(6,2),
  fuel_consumed_liters NUMERIC(10,2),
  fuel_efficiency_kmpl NUMERIC(6,2),
  route_polyline TEXT, -- JSON array of [lat, lng] points
  behavior_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fleet_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  total_distance_km NUMERIC(10,2) DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  avg_speed_kmh NUMERIC(6,2),
  max_speed_kmh NUMERIC(6,2),
  fuel_consumed_liters NUMERIC(10,2),
  fuel_efficiency_kmpl NUMERIC(6,2),
  total_idle_time_minutes INTEGER DEFAULT 0,
  behavior_events_count INTEGER DEFAULT 0,
  safety_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bus_id, analytics_date)
);

-- Indexes for performance
CREATE INDEX idx_fuel_readings_bus_timestamp ON public.bus_fuel_readings(bus_id, reading_timestamp DESC);
CREATE INDEX idx_fuel_alerts_bus_status ON public.fuel_alerts(bus_id, status);
CREATE INDEX idx_behavior_events_driver_timestamp ON public.driver_behavior_events(driver_id, event_timestamp DESC);
CREATE INDEX idx_gps_history_bus_timestamp ON public.gps_location_history(bus_id, timestamp DESC);
CREATE INDEX idx_completed_trips_bus_date ON public.completed_trips(bus_id, trip_date DESC);
CREATE INDEX idx_fleet_analytics_date ON public.fleet_analytics_daily(analytics_date DESC);

-- RLS Policies
ALTER TABLE public.fuel_consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_fuel_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all data
CREATE POLICY "Authenticated users can view fuel data" ON public.fuel_consumption_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view fuel alerts" ON public.fuel_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view fuel readings" ON public.bus_fuel_readings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view behavior events" ON public.driver_behavior_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view scorecards" ON public.driver_scorecards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view safety alerts" ON public.safety_alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view GPS history" ON public.gps_location_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view completed trips" ON public.completed_trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view fleet analytics" ON public.fleet_analytics_daily FOR SELECT USING (auth.role() = 'authenticated');

-- System can insert all data
CREATE POLICY "System can insert fuel readings" ON public.bus_fuel_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert fuel alerts" ON public.fuel_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert behavior events" ON public.driver_behavior_events FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert safety alerts" ON public.safety_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert GPS history" ON public.gps_location_history FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert completed trips" ON public.completed_trips FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert fleet analytics" ON public.fleet_analytics_daily FOR INSERT WITH CHECK (true);

-- Admins can manage fuel logs and acknowledge alerts
CREATE POLICY "Admins can manage fuel logs" ON public.fuel_consumption_logs FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alerts" ON public.fuel_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can update safety alerts" ON public.safety_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_scorecards_updated_at BEFORE UPDATE ON public.driver_scorecards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fleet_analytics_updated_at BEFORE UPDATE ON public.fleet_analytics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();