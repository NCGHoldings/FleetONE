-- Fix the test environment hierarchy to ensure strict isolation
-- 1. NCG Test Environment should have NO parent
UPDATE companies 
SET parent_company_id = NULL 
WHERE id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

-- 2. All other test companies should have NCG Test Environment as their parent
UPDATE companies 
SET parent_company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
WHERE business_unit_type = 'test' 
  AND id != 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

-- 3. Ensure live companies have NCG Holding as their parent (just in case any were left behind)
UPDATE companies 
SET parent_company_id = 'a0000000-0000-0000-0000-000000000001'
WHERE id IN (
  'a0000000-0000-0000-0000-000000000002', -- School Bus
  'a0000000-0000-0000-0000-000000000003', -- Yutong
  'a0000000-0000-0000-0000-000000000004', -- Sinotruck
  'a0000000-0000-0000-0000-000000000005', -- Special Hire
  'a0000000-0000-0000-0000-000000000006'  -- Light Vehicle
);
