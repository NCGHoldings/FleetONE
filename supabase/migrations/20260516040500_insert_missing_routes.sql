-- ==============================================================================
-- INSERT MISSING ROUTES AND ASSIGN TO ASANKA
-- This script ensures that the missing routes actually exist in the database.
-- ==============================================================================

-- 1. First update any existing variations to Asanka
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%moratuwa%nittambuwa%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%panadura%nittambuwa%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%panadura%nittabuwa%';

-- 2. Insert exactly these 3 routes if they completely do not exist
-- Adding default 'route_no', 'start_location', and 'end_location' to prevent constraint errors
INSERT INTO routes (route_no, route_name, start_location, end_location, route_leader, is_active)
SELECT '17-M', 'Moratuwa-Nittambuwa', 'Moratuwa', 'Nittambuwa', 'Asanka', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE route_name ILIKE '%moratuwa%nittambuwa%');

INSERT INTO routes (route_no, route_name, start_location, end_location, route_leader, is_active)
SELECT '17-P', 'Panadura-Nittambuwa', 'Panadura', 'Nittambuwa', 'Asanka', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE route_name ILIKE '%panadura%nittambuwa%' AND route_name NOT ILIKE '%highway%');

INSERT INTO routes (route_no, route_name, start_location, end_location, route_leader, is_active)
SELECT '17-HW', 'Panadura-Nittambuwa (Highway)', 'Panadura', 'Nittambuwa', 'Asanka', true
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE route_name ILIKE '%panadura%nittambuwa%highway%');
