-- Fix existing vendor "abisheka fernado" to use Consolidated GL pattern
UPDATE vendors 
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020',  -- NCG Holding
  business_unit_code = 'SBO'  -- School Bus Operations
WHERE id = 'b6f69188-058d-4c80-891a-a5348f124e53';

-- Also fix any vendors under School Bus Operations sub-company
UPDATE vendors 
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020',
  business_unit_code = 'SBO'
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'
AND business_unit_code IS NULL;

-- Fix any customers under School Bus Operations sub-company
UPDATE customers 
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020',
  business_unit_code = 'SBO'
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'
AND business_unit_code IS NULL;