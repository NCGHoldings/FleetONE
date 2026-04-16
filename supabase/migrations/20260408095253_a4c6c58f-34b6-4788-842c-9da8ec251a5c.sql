
-- Part 1: Add route_group column
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_group text;

-- Part 2: Create a function to merge routes (update all references then delete source)
CREATE OR REPLACE FUNCTION merge_route(source_id uuid, target_id uuid, target_name text)
RETURNS void AS $$
BEGIN
  -- Update fleet_master_roster
  UPDATE fleet_master_roster SET route_id = target_id, route_label = target_name
  WHERE route_id = source_id;
  
  -- Update daily_trips
  UPDATE daily_trips SET route_id = target_id, route_label = target_name
  WHERE route_id = source_id;
  
  -- Update buses
  UPDATE buses SET route = target_name
  WHERE route = (SELECT route_name FROM routes WHERE id = source_id);
  
  -- Update tables with route_id FK
  UPDATE ap_invoices SET route_id = target_id WHERE route_id = source_id;
  UPDATE driver_allocations SET route_id = target_id WHERE route_id = source_id;
  UPDATE journal_entry_lines SET route_id = target_id WHERE route_id = source_id;
  UPDATE multi_day_route_config SET route_id = target_id WHERE route_id = source_id;
  UPDATE real_time_tracking SET route_id = target_id WHERE route_id = source_id;
  UPDATE route_permits SET route_id = target_id WHERE route_id = source_id;
  UPDATE route_targets SET route_id = target_id WHERE route_id = source_id;
  UPDATE staff_commissions SET route_id = target_id WHERE route_id = source_id;
  
  -- Delete the source route
  DELETE FROM routes WHERE id = source_id;
END;
$$ LANGUAGE plpgsql;

-- Part 3: Execute merges
-- Merge "Jaffna To Moratuwa" into "Jaffna - Moratuwa" (87R)
SELECT merge_route('b1feadf8-92cf-4cd7-a04d-fb39c2c33fa7', 'ef2162a1-2b32-48ac-a068-391b76936a9e', 'Jaffna - Moratuwa');

-- Merge "Moratuwa To Jaffna" into "Moratuwa - Jaffna" (87)
SELECT merge_route('dce1124d-6b02-4501-a345-db44365febb4', 'f8915451-ad84-4c2c-a277-711fc609867f', 'Moratuwa - Jaffna');

-- Merge "Colombo - Jaffna A9" into "Colombo - Jaffna" (CJ-01)
SELECT merge_route('a777d7af-4a31-4f83-bdf6-fc321ec9cbe3', '7c1dc50a-e4f2-4211-a1a4-ceb59bf8dc02', 'Colombo - Jaffna');

-- Merge "Colombo - Kandy Express" into "Colombo - Kandy" (CK-01)
SELECT merge_route('a8f461fe-39ce-4c5a-b82c-5f1d4dfd6953', '58f83941-4f23-47e2-88ed-b2c9f7c2e640', 'Colombo - Kandy');

-- Drop the helper function
DROP FUNCTION merge_route;

-- Part 4: Set corridor groups
UPDATE routes SET route_group = 'Badulla - Makumbura' WHERE id IN ('2acef7d4-de95-4d3c-8094-1c90ff1a4c78', '086aabc2-20f1-4801-90dc-255a72e20898');
UPDATE routes SET route_group = 'Moratuwa - Jaffna' WHERE id IN ('f8915451-ad84-4c2c-a277-711fc609867f', 'ef2162a1-2b32-48ac-a068-391b76936a9e');
UPDATE routes SET route_group = 'Nittambuwa - Panadura' WHERE id IN ('5b37dea9-af38-45cc-bc03-707e4b2e6a78', '4b8d9e0c-063c-4dbb-9869-f051d0440b9d');
UPDATE routes SET route_group = 'Colombo - Rathnapura' WHERE id IN ('95ad6f87-013e-4b07-a41b-7bbe2c0a5f43', '1526dfcc-5ef0-4b60-a4b1-dd8d8518674d');
UPDATE routes SET route_group = 'Kegalle - Colombo' WHERE id IN ('b2222712-bfb8-47f0-8903-c2a862038a04', 'c0342152-56f0-47ab-89ea-315bc10f206d');

-- Part 5: Fix "Colombo to Passara" bad data
UPDATE routes SET start_location = 'Colombo', end_location = 'Passara' WHERE id = '177b642b-8289-448a-9f06-1fb7a1d1295e';
