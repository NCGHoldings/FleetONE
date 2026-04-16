-- Create driver_training table
CREATE TABLE public.driver_training (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    training_id TEXT UNIQUE NOT NULL,
    driver_id UUID REFERENCES public.profiles(user_id) NOT NULL,
    driver_name TEXT NOT NULL,
    training_type TEXT NOT NULL,
    training_date DATE NOT NULL,
    duration NUMERIC, -- Duration in hours
    instructor_name TEXT,
    instructor_phone TEXT,
    instructor_email TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add check constraints for driver_training
ALTER TABLE public.driver_training 
ADD CONSTRAINT training_status_check 
CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- Create real_time_tracking table
CREATE TABLE public.real_time_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bus_id UUID REFERENCES public.buses(id) NOT NULL,
    bus_no TEXT NOT NULL,
    current_location TEXT,
    gps_coordinates JSONB, -- {lat: number, lng: number}
    route_id UUID REFERENCES public.routes(id),
    route_name TEXT,
    speed_kmh NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'inactive',
    last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fuel_level NUMERIC, -- Percentage 0-100
    tire_pressure JSONB, -- {front_left: number, front_right: number, rear_left: number, rear_right: number}
    engine_health TEXT DEFAULT 'good',
    engine_temperature NUMERIC,
    oil_pressure NUMERIC,
    battery_voltage NUMERIC,
    odometer_reading INTEGER,
    driver_id UUID REFERENCES public.profiles(user_id),
    driver_name TEXT,
    alerts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check constraints for real_time_tracking
ALTER TABLE public.real_time_tracking 
ADD CONSTRAINT tracking_status_check 
CHECK (status IN ('active', 'inactive', 'maintenance', 'emergency', 'offline'));

ALTER TABLE public.real_time_tracking 
ADD CONSTRAINT engine_health_check 
CHECK (engine_health IN ('excellent', 'good', 'warning', 'critical'));

-- Enable RLS on both tables
ALTER TABLE public.driver_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_training
CREATE POLICY "All authenticated users can view training records" 
ON public.driver_training 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage training records" 
ON public.driver_training 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for real_time_tracking  
CREATE POLICY "All authenticated users can view tracking data" 
ON public.real_time_tracking 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Supervisors can manage tracking data" 
ON public.real_time_tracking 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_driver_training_updated_at
    BEFORE UPDATE ON public.driver_training
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_real_time_tracking_updated_at
    BEFORE UPDATE ON public.real_time_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for driver_training
INSERT INTO public.driver_training (training_id, driver_id, driver_name, training_type, training_date, duration, instructor_name, status) VALUES
('TRN-2024-001', (SELECT user_id FROM profiles LIMIT 1), 'John Silva', 'Defensive Driving', '2024-12-25', 8, 'Mike Johnson', 'scheduled'),
('TRN-2024-002', (SELECT user_id FROM profiles LIMIT 1), 'Jane Perera', 'Vehicle Safety', '2024-12-20', 4, 'Sarah Wilson', 'completed'),
('TRN-2024-003', (SELECT user_id FROM profiles LIMIT 1), 'David Fernando', 'Emergency Response', '2024-12-28', 6, 'Robert Chen', 'in_progress');

-- Insert some sample data for real_time_tracking (mock data)
INSERT INTO public.real_time_tracking (bus_id, bus_no, current_location, gps_coordinates, route_name, speed_kmh, status, fuel_level, tire_pressure, engine_health) 
SELECT 
    id, 
    bus_no, 
    'Colombo - Main Street', 
    '{"lat": 6.9271, "lng": 79.8612}'::jsonb,
    'Colombo - Kandy Route',
    CASE WHEN random() > 0.5 THEN 45 ELSE 0 END,
    CASE WHEN random() > 0.7 THEN 'active' ELSE 'inactive' END,
    50 + (random() * 50)::integer,
    '{"front_left": 32, "front_right": 31, "rear_left": 33, "rear_right": 32}'::jsonb,
    CASE WHEN random() > 0.8 THEN 'warning' ELSE 'good' END
FROM public.buses 
LIMIT 5;