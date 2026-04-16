
-- SWAP: Old NCG Holding → becomes Test
UPDATE companies SET name = 'NCG Test Environment', business_unit_type = 'test' WHERE id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';
UPDATE companies SET name = 'Test Yutong', business_unit_type = 'test' WHERE id = 'efc37802-e6bf-4426-ab69-fcac84c953b1';
UPDATE companies SET name = 'Test School Bus', business_unit_type = 'test' WHERE id = '0fba4a2f-598b-47e8-b863-283d00380b06';
UPDATE companies SET name = 'Test Sinotruck', business_unit_type = 'test' WHERE id = 'fe7439e7-3dde-47fd-8052-10b9eaf7abe8';
UPDATE companies SET name = 'Test Special Hire', business_unit_type = 'test' WHERE id = 'bfd054c7-2403-4972-9a8a-2599a777a801';
UPDATE companies SET name = 'Test Light Vehicle', business_unit_type = 'test' WHERE id = 'ac957087-0224-4149-b231-7aa9e6a3aea1';

-- SWAP: Old Test → becomes Live
UPDATE companies SET name = 'NCG Holding (Pvt) Ltd', business_unit_type = 'holding' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE companies SET name = 'Yutong Sales', business_unit_type = 'yutong' WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE companies SET name = 'School Bus Operations', business_unit_type = 'school_bus' WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE companies SET name = 'Sinotruck Sales', business_unit_type = 'sinotruck' WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE companies SET name = 'Special Hire', business_unit_type = 'special_hire' WHERE id = 'a0000000-0000-0000-0000-000000000005';
UPDATE companies SET name = 'Light Vehicle Sales', business_unit_type = 'light_vehicle' WHERE id = 'a0000000-0000-0000-0000-000000000006';
