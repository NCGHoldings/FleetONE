-- Create missing buses
INSERT INTO public.buses (bus_no, type, model, year, capacity, status, expected_km_per_liter) VALUES
('NE 0746', 'Regular', 'Tata LP 1512', 2020, 40, 'active', 8.0),
('NE 0762', 'Regular', 'Tata LP 1512', 2021, 40, 'active', 8.0),
('NE 1184', 'Regular', 'Tata LP 1512', 2019, 40, 'active', 8.0);

-- Create Route 15 with bidirectional route names
INSERT INTO public.routes (route_no, route_name, start_location, end_location, distance_km, estimated_duration_minutes) VALUES
('15', 'Badulla to Makumbura', 'Badulla', 'Makumbura', 45, 90),
('15R', 'Makumbura to Badulla', 'Makumbura', 'Badulla', 45, 90);