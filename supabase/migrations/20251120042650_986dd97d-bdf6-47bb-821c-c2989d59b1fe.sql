-- Seed remaining Sinotruck truck models (6-15)
INSERT INTO sinotruck_truck_models (
  truck_name, model_name, body_type, drive_configuration, year, condition,
  capacity_kw, base_price, engine_model, horsepower, engine_type,
  emission_standard, fuel_type, fuel_tank_capacity, transmission_model,
  transmission_type, gears, front_axle_capacity, rear_axle_capacity,
  suspension_type, wheelbase, tyre_size, tyre_quantity, cabin_model, seating_capacity,
  max_speed, gradeability, gvw_gcw, payload_capacity, body_dimensions, body_volume,
  abs_system, cameras, gps_tracking, multimedia_system, driver_seat_type, is_active
) VALUES
-- 6. 4×2 Cargo Truck 12ft with Crew Cabin (110 HP)
('SINOTRUK 4×2 Cargo Truck 12ft Crew Cabin', 'ZZ1048D3314C1', 'Cargo', '4×2', 2025, 'Brand New',
 110, 9500000, 'WP2.3Q110E50', '110 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '80 L', 'C6J45T', 'Manual', '6 Forward + 1 Reverse',
 '2 T', '3.8 T', 'Multi-leaf spring', '3360 mm', '7.00R16 tubeless', '6+1 spare',
 'Crew cabin with A/C', 'Driver + Crew', '~90 km/h', '25–30%', 'GVW: 5.8 T',
 '~3.5–4.0 Tons', NULL, NULL, true, 'Rear-view camera', false, 'MP5', 'Standard', true),

-- 7. 4×2 Cargo Truck 14.5T (130 HP)
('SINOTRUK 4×2 Cargo Truck 14.5T', 'ZZ1048E3314E145', 'Cargo', '4×2', 2025, 'Brand New',
 130, 12000000, 'WP2.3NQ130E50', '130 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '150 L', 'C6J45T', 'Manual', '6 Forward + 1 Reverse',
 '2.4 T', '5 T', 'Multi-leaf spring', '3500 mm', '7.50R16 tubeless', '6+1 spare',
 '2080 mm cabin with A/C', 'Driver + Passengers', '~95 km/h', '28–30%', 'GVW: 7.4 T',
 '~4.5–5.0 Tons', NULL, NULL, true, 'Rear-view camera', false, 'MP5', 'Ergonomic', true),

-- 8. 4×2 Cargo Truck 14ft Crew Cabin (130 HP)
('SINOTRUK 4×2 Cargo Truck 14ft Crew Cabin', 'ZZ1048D3314E1R', 'Cargo', '4×2', 2025, 'Brand New',
 130, 13000000, 'WP2.3NQ130E50', '130 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '150 L', 'C6J45T', 'Manual', '6 Forward + 1 Reverse',
 '2.4 T', '5 T', 'Multi-leaf spring', '3800 mm', '7.50R16 tubeless', '6+1 spare',
 '4-door crew cabin with A/C', 'Driver + 5 passengers', '~90 km/h', '25–30%',
 'GVW: 7.4 T', '~4–4.5 Tons', NULL, NULL, true, '4-direction cameras', true, 'MP5', 'Air suspension', true),

-- 9. 4×2 Tipper 1 Cube (110 HP)
('SINOTRUK 4×2 Tipper 1 Cube', 'ZZ3108D2814E1R', 'Tipper', '4×2', 2025, 'Brand New',
 110, 10500000, 'WP2.3Q110E50', '110 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '80 L', 'C6J45TB', 'Manual', '6 Forward, 1 Reverse',
 '2 T', '3.8 T', 'Leaf spring', '2900 mm', '7.50R16 tubeless', '6+1 spare',
 '1880 mm single-row cabin with A/C', 'Driver + 1 passenger', '~90 km/h', '25–30%',
 'GVW: ~5.8 T', '3–3.5 Tons', '3150 × 2000 × 500 mm', '3 m³',
 true, 'Rear-view camera', false, 'MP5', 'Standard', true),

-- 10. 4×2 Freezer Truck (130 HP)
('SINOTRUK 4×2 Freezer Truck', 'ZZ1048E3314E1R', 'Freezer', '4×2', 2025, 'Brand New',
 130, 15000000, 'WP2.3NQ130E50', '130 HP', '4-cylinder, turbocharged',
 'Euro 5', 'Diesel', '150 L', 'C6J45T', 'Manual', '6 Forward + 1 Reverse',
 '2.4 T', '5 T', 'Multi-leaf spring', '3500 mm', '7.50R16 tubeless', '6+1 spare',
 '2080 mm cabin with A/C', 'Driver + 1 passenger', '~90 km/h', '25–28%', 'GVW: 7.4 T',
 '~4–4.5 Tons', '4300 × 2050 × 2050 mm', 'Insulated', true, 'Rear-view camera', false, 'MP5', 'Standard', true),

-- 11. HOWO NX 4×2 Cargo Chassis (280 HP)
('SINOTRUK HOWO NX 4×2 Cargo Chassis', 'ZZ1187K511JE1', 'Cargo', '4×2', 2025, 'Brand New',
 280, 35000000, 'MC07.28-50', '280 HP', '6-cylinder inline, turbocharged',
 'Euro 5', 'Diesel', '400 L', 'HW13709XST', 'Manual', '9 Forward + 1 Reverse',
 '7.5 T', '16 T, double reduction', 'Multi-leaf spring', '4800–5200 mm', '295/80R22.5',
 '6+1 spare', 'H78L two-sleeper with A/C', 'Driver + 1 passenger sleeper', '~90–95 km/h',
 '25–30%', 'GVW: 23.5–24 T', 'Medium to heavy-duty', NULL, NULL,
 true, '4-direction cameras', true, 'MP5', 'Air suspension', true),

-- 12. HOWO NX 4×2 Cargo Chassis Crew Cabin (280 HP)
('SINOTRUK HOWO NX 4×2 Cargo Chassis Crew Cabin', 'ZZ1187K511JE1-CREW', 'Cargo', '4×2', 2025, 'Brand New',
 280, 38000000, 'MC07.28-50', '280 HP', '6-cylinder inline, turbocharged',
 'Euro 5', 'Diesel', '400 L', 'HW13709XST', 'Manual', '9 Forward + 1 Reverse',
 '7.5 T', '16 T, double reduction', 'Multi-leaf spring', '4800–5200 mm', '295/80R22.5',
 '6+1 spare', '4-door 2-row crew cabin with A/C', 'Driver + 5 passengers', '~90–95 km/h',
 '25–30%', 'GVW: 23.5–24 T', 'Medium to heavy-duty', NULL, NULL,
 true, '4-direction cameras', true, 'MP5', 'Air suspension', true),

-- 13. HOWO NX 6×4 Cargo Chassis Crew Cabin (340 HP)
('SINOTRUK HOWO NX 6×4 Cargo Chassis Crew Cabin', 'ZZ1257V464JE1-CREW', 'Cargo', '6×4', 2025, 'Brand New',
 340, 58000000, 'MC07.34-50', '340 HP', '6-cylinder inline, turbocharged',
 'Euro 5', 'Diesel', '400 L', 'HW13709XST', 'Manual', '9 Forward + 1 Reverse',
 '9.5 T', '16 T × 2', 'Multi-leaf spring', 'Standard', '295/80R22.5', '10+1 spare',
 '4-door 2-row crew cabin with A/C', 'Driver + 5 passengers', '~90–95 km/h', '25–30%',
 'GVW: ~45–46 T', 'High capacity', NULL, NULL,
 true, '4-direction cameras', true, 'MP5', 'Air suspension', true),

-- 14. HOWO 8×4 Cargo Chassis (440 HP)
('SINOTRUK HOWO 8×4 Cargo Chassis', 'MC11.44-50-8X4', 'Cargo', '8×4', 2025, 'Brand New',
 440, 70000000, 'MC11.44-50', '440 HP', '6-cylinder inline, turbocharged',
 'Euro 5', 'Diesel', '400 L', 'HW25712XACL', 'AMT', '12 Forward, 2 Reverse',
 '9.5 T × 2', '16 T × 2, double reduction', 'Multi-leaf spring', 'Heavy-duty', '315/80R22.5',
 '12+1 spare', 'H78L two sleeper', 'Driver + co-driver', '~95 km/h', '~30%',
 'GVW: 50 T', 'Loading: 40 T', NULL, NULL,
 true, '4-direction cameras', true, 'Fleet management GPS', 'Air suspension', true)
ON CONFLICT (id) DO NOTHING;