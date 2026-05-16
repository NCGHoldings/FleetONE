-- ==============================================================================
-- UPDATE ROUTE LEADERS BASED ON OFFICIAL MASTER LIST
-- This script fixes the "UNASSIGNED LEADER" issue on the Staff Profiles Dashboard
-- by correctly mapping every active route to its designated Team Leader.
-- ==============================================================================

-- 1. Niroshan (6 Routes)
UPDATE routes SET route_leader = 'Niroshan' WHERE route_name ILIKE '%Jaffna%';
UPDATE routes SET route_leader = 'Niroshan' WHERE route_name ILIKE '%Badulla%';
UPDATE routes SET route_leader = 'Niroshan' WHERE route_name ILIKE '%Badulla 99%';
UPDATE routes SET route_leader = 'Niroshan' WHERE route_name ILIKE '%Passara%';
UPDATE routes SET route_leader = 'Niroshan' WHERE route_name ILIKE '%Panama%';
UPDATE routes SET route_leader = 'Niroshan' WHERE route_name ILIKE '%Madolsima%';

-- 2. Asanka (11 Routes)
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Panadura%Kandy%XL%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Panadura%Kandy%' AND route_name NOT ILIKE '%XL%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Panadura%Nittambuwa%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Panadura%Nittabuwa%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Moratuwa%Nittambuwa%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Mirigama%Panadura%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Colombo%Horana%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Horana%Kaduwela%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Kaduwela%Moratuwa%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Kadawatha%Navinna%';
UPDATE routes SET route_leader = 'Asanka' WHERE route_name ILIKE '%Awissawella%Colombo%';

-- 3. Nayana (7 Routes)
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Colombo%Nuwara%Eliya%';
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Colombo%Kandy%';
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Colombo%Trinco%';
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Colombo%Gampola%';
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Kegalle%Colombo%';
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Colombo%Anuradhapura%';
UPDATE routes SET route_leader = 'Nayana' WHERE route_name ILIKE '%Welimada%Colombo%';

-- 4. Dedunu (1 Route)
UPDATE routes SET route_leader = 'Dedunu' WHERE route_name ILIKE '%Rathnapura%Colombo%';

-- 5. Set any remaining nulls or empties to 'Unassigned'
UPDATE routes SET route_leader = 'Unassigned' WHERE route_leader IS NULL OR route_leader = '';
