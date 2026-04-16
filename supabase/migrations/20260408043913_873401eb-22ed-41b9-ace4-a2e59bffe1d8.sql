
-- Step 1: Add category column
ALTER TABLE routes ADD COLUMN IF NOT EXISTS category text;

-- Step 2: Reassign FK references from duplicates to canonical routes before deletion
-- 98af32fa (Badulla - Makubura dup) -> 2acef7d4 (route 15 Badulla to Makumbura)
UPDATE ap_invoices SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id = '98af32fa-d555-4dfb-87f9-1d4f033680ad';
UPDATE ap_invoices SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id = 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e';
UPDATE ap_invoices SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id = 'e8a74ff6-a9e8-4130-8bf8-6bf36dabc403';
UPDATE ap_invoices SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id = '121d7c30-ce25-4b61-87c6-2caa71db4e9c';
UPDATE ap_invoices SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id = '1e64f7cf-01dc-4126-8028-dfa6374a438f';
UPDATE ap_invoices SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id = '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde';
UPDATE ap_invoices SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id = '80dbc4bc-0702-4170-a3f5-a2390ecb85e1';
UPDATE ap_invoices SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id = '82698df8-fc93-496e-b255-dfa3038c0bc2';
UPDATE ap_invoices SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE ap_invoices SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

-- Also reassign in other FK tables
UPDATE daily_trips SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id IN ('98af32fa-d555-4dfb-87f9-1d4f033680ad', 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e');
UPDATE daily_trips SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id IN ('e8a74ff6-a9e8-4130-8bf8-6bf36dabc403', '121d7c30-ce25-4b61-87c6-2caa71db4e9c');
UPDATE daily_trips SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id IN ('1e64f7cf-01dc-4126-8028-dfa6374a438f', '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde', '80dbc4bc-0702-4170-a3f5-a2390ecb85e1', '82698df8-fc93-496e-b255-dfa3038c0bc2');
UPDATE daily_trips SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE daily_trips SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

UPDATE fleet_master_roster SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id IN ('98af32fa-d555-4dfb-87f9-1d4f033680ad', 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e');
UPDATE fleet_master_roster SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id IN ('e8a74ff6-a9e8-4130-8bf8-6bf36dabc403', '121d7c30-ce25-4b61-87c6-2caa71db4e9c');
UPDATE fleet_master_roster SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id IN ('1e64f7cf-01dc-4126-8028-dfa6374a438f', '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde', '80dbc4bc-0702-4170-a3f5-a2390ecb85e1', '82698df8-fc93-496e-b255-dfa3038c0bc2');
UPDATE fleet_master_roster SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE fleet_master_roster SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

UPDATE driver_allocations SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id IN ('98af32fa-d555-4dfb-87f9-1d4f033680ad', 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e');
UPDATE driver_allocations SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id IN ('e8a74ff6-a9e8-4130-8bf8-6bf36dabc403', '121d7c30-ce25-4b61-87c6-2caa71db4e9c');
UPDATE driver_allocations SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id IN ('1e64f7cf-01dc-4126-8028-dfa6374a438f', '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde', '80dbc4bc-0702-4170-a3f5-a2390ecb85e1', '82698df8-fc93-496e-b255-dfa3038c0bc2');
UPDATE driver_allocations SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE driver_allocations SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

UPDATE route_permits SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id IN ('98af32fa-d555-4dfb-87f9-1d4f033680ad', 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e');
UPDATE route_permits SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id IN ('e8a74ff6-a9e8-4130-8bf8-6bf36dabc403', '121d7c30-ce25-4b61-87c6-2caa71db4e9c');
UPDATE route_permits SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id IN ('1e64f7cf-01dc-4126-8028-dfa6374a438f', '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde', '80dbc4bc-0702-4170-a3f5-a2390ecb85e1', '82698df8-fc93-496e-b255-dfa3038c0bc2');
UPDATE route_permits SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE route_permits SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

UPDATE route_targets SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id IN ('98af32fa-d555-4dfb-87f9-1d4f033680ad', 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e');
UPDATE route_targets SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id IN ('e8a74ff6-a9e8-4130-8bf8-6bf36dabc403', '121d7c30-ce25-4b61-87c6-2caa71db4e9c');
UPDATE route_targets SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id IN ('1e64f7cf-01dc-4126-8028-dfa6374a438f', '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde', '80dbc4bc-0702-4170-a3f5-a2390ecb85e1', '82698df8-fc93-496e-b255-dfa3038c0bc2');
UPDATE route_targets SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE route_targets SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

UPDATE staff_commissions SET route_id = '2acef7d4-de95-4d3c-8094-1c90ff1a4c78' WHERE route_id IN ('98af32fa-d555-4dfb-87f9-1d4f033680ad', 'b7e7b5d1-6fe1-4515-81af-4d80b66b094e');
UPDATE staff_commissions SET route_id = '086aabc2-20f1-4801-90dc-255a72e20898' WHERE route_id IN ('e8a74ff6-a9e8-4130-8bf8-6bf36dabc403', '121d7c30-ce25-4b61-87c6-2caa71db4e9c');
UPDATE staff_commissions SET route_id = '177b642b-8289-448a-9f06-1fb7a1d1295e' WHERE route_id IN ('1e64f7cf-01dc-4126-8028-dfa6374a438f', '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde', '80dbc4bc-0702-4170-a3f5-a2390ecb85e1', '82698df8-fc93-496e-b255-dfa3038c0bc2');
UPDATE staff_commissions SET route_id = 'f8915451-ad84-4c2c-a277-711fc609867f' WHERE route_id = '3d939b47-3984-4e57-b1d0-0e9592810704';
UPDATE staff_commissions SET route_id = 'ef2162a1-2b32-48ac-a068-391b76936a9e' WHERE route_id = 'a5dec56c-b5ea-4902-8faf-560d41eced85';

-- Step 3: Now safe to delete duplicates
DELETE FROM routes WHERE id IN (
  '98af32fa-d555-4dfb-87f9-1d4f033680ad',
  'b7e7b5d1-6fe1-4515-81af-4d80b66b094e',
  'e8a74ff6-a9e8-4130-8bf8-6bf36dabc403',
  '121d7c30-ce25-4b61-87c6-2caa71db4e9c',
  '1e64f7cf-01dc-4126-8028-dfa6374a438f',
  '39d2f4ff-1db6-4dd7-b8f3-fbb43ac6ccde',
  '80dbc4bc-0702-4170-a3f5-a2390ecb85e1',
  '82698df8-fc93-496e-b255-dfa3038c0bc2',
  '3d939b47-3984-4e57-b1d0-0e9592810704',
  'a5dec56c-b5ea-4902-8faf-560d41eced85'
);

-- Step 4: Insert missing routes
INSERT INTO routes (route_no, route_name, start_location, end_location, category, is_active) VALUES
  ('PK-01', 'Panadura - Kandy', 'Panadura', 'Kandy', 'Public Bus', true),
  ('CG-01', 'Colombo - Gampola', 'Colombo', 'Gampola', 'Public Bus', true),
  ('CK-01', 'Colombo - Kandy', 'Colombo', 'Kandy', 'Public Bus', true),
  ('CJ-01', 'Colombo - Jaffna', 'Colombo', 'Jaffna', 'Public Bus', true),
  ('BC-01', 'Badulla - Colombo (AC)', 'Badulla', 'Colombo', 'Public Bus', true),
  ('CA-01', 'Colombo - Anuradhapura via Maradankadawala', 'Colombo', 'Anuradhapura', 'Public Bus', true),
  ('CKG-01', 'Colombo - Kegalle via Warakapola', 'Colombo', 'Kegalle', 'Public Bus', true),
  ('CT-01', 'Colombo - Trincomalee', 'Colombo', 'Trincomalee', 'Public Bus', true),
  ('CNE-01', 'Colombo - Nuwara Eliya', 'Colombo', 'Nuwara Eliya', 'Public Bus', true),
  ('CP-01', 'Colombo - Panama', 'Colombo', 'Panama', 'Public Bus', true),
  ('CR-01', 'Colombo - Rathnapura', 'Colombo', 'Rathnapura', 'Public Bus', true),
  ('RC-01', 'Rathnapura - Colombo', 'Rathnapura', 'Colombo', 'Public Bus', true),
  ('HK-01', 'Horana - Kaduwela', 'Horana', 'Kaduwela', 'Public Bus', true),
  ('KC-01', 'Kegalle - Colombo', 'Kegalle', 'Colombo', 'Public Bus', true),
  ('MM-01', 'Makubura - Madolsima', 'Makubura', 'Madolsima', 'Public Bus', true),
  ('MK-01', 'Moratuwa - Kankasanthurei', 'Moratuwa', 'Kankasanthurei', 'Public Bus', true),
  ('NTB-01', 'Nittambuwa', 'Nittambuwa', 'Nittambuwa', 'Public Bus', true),
  ('NP-01', 'Nittambuwa - Panadura', 'Nittambuwa', 'Panadura', 'Public Bus', true),
  ('PN-01', 'Panadura - Nittambuwa', 'Panadura', 'Nittambuwa', 'Public Bus', true),
  ('PKR-01', 'Panadura - Kareinagra', 'Panadura', 'Kareinagra', 'Public Bus', true),
  ('PAV-01', 'Puttalam - Anuradhapura - Vavuniya', 'Puttalam', 'Vavuniya', 'Public Bus', true),
  ('SBS-PK', 'Panadura - Kandy (School)', 'Panadura', 'Kandy', 'School Bus', true),
  ('SBS-KC', 'Kegalle - Colombo (School)', 'Kegalle', 'Colombo', 'School Bus', true)
ON CONFLICT DO NOTHING;

-- Step 5: Set category on existing routes
UPDATE routes SET category = 'Public Bus' WHERE route_no IN ('8/1/99', '15', '15R', '87', '87R', 'R101', 'R102', 'R103', 'R104', 'R105', 'R17559903319470', 'R17559903319471');
UPDATE routes SET category = 'Public Bus' WHERE category IS NULL;
