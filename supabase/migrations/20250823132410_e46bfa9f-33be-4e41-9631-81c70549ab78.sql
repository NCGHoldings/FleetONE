-- Insert sample buses
INSERT INTO public.buses (bus_no, type, route, model, year, capacity, status, current_mileage, registration_number, insurance_expiry, revenue_license_expiry) VALUES
('NK-2847', 'Inter-City', 'Colombo - Kandy', 'Ashok Leyland Viking', 2020, 49, 'active', 125000, 'NK-2847-2020', '2025-06-15', '2025-12-31'),
('NK-1234', 'Highway', 'Colombo - Galle', 'Tata Starbus', 2019, 45, 'active', 142000, 'NK-1234-2019', '2025-08-20', '2025-12-31'),
('NK-5678', 'Hill Country', 'Kandy - Nuwara Eliya', 'Ashok Leyland Viking', 2021, 42, 'maintenance', 98000, 'NK-5678-2021', '2025-09-10', '2025-12-31'),
('NK-9012', 'City', 'Colombo Local', 'Tata Starbus', 2018, 38, 'idle', 185000, 'NK-9012-2018', '2025-07-05', '2025-12-31'),
('NK-3456', 'Inter-City', 'Colombo - Jaffna', 'Mahindra Tourister', 2022, 52, 'active', 85000, 'NK-3456-2022', '2025-11-15', '2025-12-31');

-- Insert sample routes
INSERT INTO public.routes (route_no, route_name, start_location, end_location, via_locations, distance_km, estimated_duration_minutes, fare_amount, is_active) VALUES
('R101', 'Colombo - Kandy Express', 'Colombo Fort', 'Kandy Bus Station', '{"Kegalle", "Mawanella"}', 115.5, 180, 250.00, true),
('R102', 'Colombo - Galle Highway', 'Colombo Bastian Mawatha', 'Galle Bus Station', '{"Kalutara", "Bentota", "Ambalangoda"}', 119.2, 150, 180.00, true),
('R103', 'Kandy - Nuwara Eliya Hill Route', 'Kandy Bus Station', 'Nuwara Eliya Bus Stand', '{"Peradeniya", "Gampola", "Nawalapitiya"}', 78.3, 120, 120.00, true),
('R104', 'Colombo Local Route', 'Colombo Fort', 'Colombo Suburbs', '{"Borella", "Rajagiriya", "Battaramulla"}', 25.0, 60, 50.00, true),
('R105', 'Colombo - Jaffna A9', 'Colombo Fort', 'Jaffna Bus Station', '{"Vavuniya", "Kilinochchi"}', 395.8, 480, 850.00, true);

-- Insert sample daily trips
INSERT INTO public.daily_trips (trip_no, bus_id, route_id, trip_date, start_time, end_time, odometer_start, odometer_end, distance_km, income, fuel_cost, fuel_liters, diesel_price_per_liter, other_expenses, total_expenses, net_income, km_per_liter, status) VALUES
('T001-20240115', (SELECT id FROM public.buses WHERE bus_no = 'NK-2847'), (SELECT id FROM public.routes WHERE route_no = 'R101'), '2024-01-15', '06:00', '10:30', 124800, 124920, 120.0, 12500.00, 3200.00, 14.55, 220.00, 300.00, 3500.00, 9000.00, 8.25, 'completed'),
('T002-20240115', (SELECT id FROM public.buses WHERE bus_no = 'NK-1234'), (SELECT id FROM public.routes WHERE route_no = 'R102'), '2024-01-15', '07:15', '11:45', 141850, 141970, 120.0, 10800.00, 2950.00, 13.41, 220.00, 250.00, 3200.00, 7600.00, 8.95, 'completed'),
('T003-20240116', (SELECT id FROM public.buses WHERE bus_no = 'NK-2847'), (SELECT id FROM public.routes WHERE route_no = 'R101'), '2024-01-16', '08:00', NULL, 124920, NULL, NULL, 0, 0, 0, 220.00, 0, 0, 0, 0, 'ongoing'),
('T004-20240116', (SELECT id FROM public.buses WHERE bus_no = 'NK-3456'), (SELECT id FROM public.routes WHERE route_no = 'R105'), '2024-01-16', '05:30', '14:00', 84600, 85000, 400.0, 28500.00, 8800.00, 40.00, 220.00, 1200.00, 10000.00, 18500.00, 10.00, 'completed');

-- Insert sample maintenance records
INSERT INTO public.maintenance_records (maintenance_no, bus_id, service_type, description, scheduled_date, estimated_hours, estimated_cost, workshop, priority, status, next_service_km, next_service_date) VALUES
('MNT001', (SELECT id FROM public.buses WHERE bus_no = 'NK-5678'), 'Engine Service', 'Complete engine overhaul and oil change', '2024-01-20', 8.0, 25000.00, 'Main Workshop', 'high', 'pending', 108000, '2024-07-20'),
('MNT002', (SELECT id FROM public.buses WHERE bus_no = 'NK-9012'), 'Brake Service', 'Brake pad replacement and system check', '2024-01-18', 4.0, 15000.00, 'Bay 2', 'medium', 'in_progress', 195000, '2024-04-18'),
('MNT003', (SELECT id FROM public.buses WHERE bus_no = 'NK-1234'), 'Tire Replacement', 'Replace front tires', '2024-01-22', 2.0, 12000.00, 'Bay 1', 'low', 'pending', 152000, '2024-03-22');

-- Insert sample route permits
INSERT INTO public.route_permits (permit_no, route_id, bus_id, route_name, owner_name, owner_address, owner_nic, service_type, seats, max_fare, issue_date, expiry_date, annual_fee, permit_status) VALUES
('PRM2024001', (SELECT id FROM public.routes WHERE route_no = 'R101'), (SELECT id FROM public.buses WHERE bus_no = 'NK-2847'), 'Colombo - Kandy Express Service', 'NCG Transport Ltd', 'No. 123, Galle Road, Colombo 03', '751234567V', 'Express', 49, 300.00, '2024-01-01', '2024-12-31', 75000.00, 'valid'),
('PRM2024002', (SELECT id FROM public.routes WHERE route_no = 'R102'), (SELECT id FROM public.buses WHERE bus_no = 'NK-1234'), 'Colombo - Galle Highway Service', 'NCG Transport Ltd', 'No. 123, Galle Road, Colombo 03', '751234567V', 'Highway', 45, 200.00, '2024-01-01', '2024-12-31', 60000.00, 'valid'),
('PRM2024003', (SELECT id FROM public.routes WHERE route_no = 'R105'), (SELECT id FROM public.buses WHERE bus_no = 'NK-3456'), 'Colombo - Jaffna Long Distance', 'NCG Transport Ltd', 'No. 123, Galle Road, Colombo 03', '751234567V', 'Long Distance', 52, 900.00, '2024-01-01', '2024-12-31', 120000.00, 'valid');