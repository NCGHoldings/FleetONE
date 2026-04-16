-- Seed 15 Sinotruck truck models with complete specifications
INSERT INTO sinotruck_truck_models (
  truck_name, model_name, body_type, drive_configuration, year, condition,
  capacity_kw, base_price, engine_model, horsepower, engine_type,
  emission_standard, fuel_type, fuel_tank_capacity, transmission_model,
  transmission_type, gears, front_axle_capacity, rear_axle_capacity,
  tyre_size, tyre_quantity, cabin_model, seating_capacity, max_speed,
  gradeability, gvw_gcw, payload_capacity, abs_system, cameras, gps_tracking,
  multimedia_system, is_active
) VALUES
-- 1. HOWO NX 4×2 Prime Mover (340 HP)
('SINOTRUK HOWO NX Series 4×2 Prime Mover', 'ZZ4187N361JE1R', 'Prime Mover', '4×2', 2025, 'Brand New',
 340, 45000000, 'MC07.34-50', '340 HP', '6-cylinder inline, turbocharged diesel',
 'Euro 5', 'Diesel', '400 L', 'HW13709XST', 'Manual', '9 Forward + 1 Reverse',
 '7.1 T', '16 T, double reduction', '295/80R22.5', '6+1 spare', 'H78L, two sleeper',
 'Driver + 1 co-driver sleeper', '90–102 km/h', '30%', 'GCW: 45 T', '31–33 tons',
 true, '4-direction cameras', true, 'MP5', true),

-- 2. 4×2 Cargo Truck 12ft (110 HP)
('SINOTRUK 4×2 Cargo Truck 12ft', 'ZZ1048D2914C145R', 'Cargo', '4×2', 2025, 'Brand New',
 110, 8500000, 'WP2.3Q110E50', '110 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '80 L', 'C6J45T', 'Manual', '6 Forward + 1 Reverse',
 '2 T', '3.8 T', '7.00R16 tubeless', '6+1 spare', '1880 mm cabin with A/C',
 'Driver + co-driver', '~90 km/h', '25–30%', 'GVW: 5.8 T', '~3.5–4.0 Tons',
 true, 'Rear-view camera', false, 'MP5', true),

-- 3. 4×2 Tipper 3 Cube (190 HP)
('SINOTRUK 4×2 Tipper 3 Cube', 'ZZ3168G3715E1R', 'Tipper', '4×2', 2025, 'Brand New',
 190, 18000000, 'WP4.1NQ190E50', '190 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '120 L', '8JS85F', 'Manual', '8 Forward, 2 Reverse',
 '4–5 T', '9–10 T', '10.00R20 tubeless', '6+1 spare', '2080 mm cabin',
 'Driver + 1 passenger', '~90 km/h', '28–30%', 'GVW: 14 T', '10–14 Tons',
 true, 'Rear-view camera', false, 'MP5', true),

-- 4. HOWO NX 6×4 Cargo Chassis (340 HP)
('SINOTRUK HOWO NX 6×4 Cargo Chassis 24ft', 'ZZ1257V464JE1', 'Cargo', '6×4', 2025, 'Brand New',
 340, 55000000, 'MC07.34-50', '340 HP', '6-cylinder inline, turbocharged',
 'Euro 5', 'Diesel', '400 L', 'HW13709XST', 'Manual', '9 Forward + 1 Reverse',
 '9.5 T', '16 T × 2', '295/80R22.5', '10+1 spare', 'H78L two sleeper',
 'Driver + 1 co-driver', '~90–95 km/h', '30–35%', 'GVW: ~45–46 T', 'High capacity',
 true, '4-direction cameras', true, 'MP5', true),

-- 5. HOWO NX 6×4 AMT Prime Mover (480 HP)
('SINOTRUK HOWO NX 6×4 AMT Prime Mover', 'ZZ4257V344KB1R', 'Prime Mover', '6×4', 2025, 'Brand New',
 480, 65000000, 'MC13.48-50', '480 HP', '6-cylinder inline, turbocharged',
 'Euro 5', 'Diesel', '600 L', 'HW25712XACL', 'AMT', '12 Forward, 2 Reverse',
 '9.5 T', '16 T × 2', '315/80R22.5', '10+1 spare', 'H78L two sleeper',
 'Driver + co-driver sleeper', '~90–95 km/h', '25–30%', 'GCW: 80 T', 'High payload',
 true, '4-direction cameras', true, 'MP5', true)
ON CONFLICT (id) DO NOTHING;