-- Auto-Link Item Categories to COA Revenue Accounts
-- Based on actual COA data from your database
-- Run this in your Supabase SQL Editor.

-- ====================================================
-- NCG HOLDING (f40b0a9d-ae5b-41b3-9188-535ae94c9020)
-- This is the PARENT company where consolidated GL posts
-- ====================================================
UPDATE item_categories SET sales_account_id = 'c4414657-5840-4c75-b3f3-5da325b45380'  -- SALES - YUTONG (41101001)
WHERE category_name = 'Yutong Sales' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = '886a6cc1-eb64-4183-9680-11677d01843e'  -- SALES - SINOTRUCK (41101002)
WHERE category_name = 'Sinotruk Sales' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = '2fe31145-ac31-44f8-9117-7d472582a58d'  -- SALES - LIGHT VEHICLES (41101003)
WHERE category_name = 'Light Vehicle Sales' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = '19891c60-a0ac-46f1-939d-15eb1bf88fba'  -- TRANSPORT INCOME - SCHOOL BUSES (41103001)
WHERE category_name = 'School Bus Revenue' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = '168235e9-9618-4346-a34e-3e2f9ed663f0'  -- TRANSPORT INCOME - SPECIAL HIRES EXTERNAL (41103003)
WHERE category_name = 'Special Hire Revenue' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = 'c8aca1b8-9fa1-4b59-ae3f-632505289a29'  -- TRANSPORT INCOME - SPECIAL HIRES INTERNAL (41103002)
WHERE category_name = 'Staff Transport Revenue' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462'  -- SALES OBSOLIT ITEMS (41104004) — best fit for spare parts
WHERE category_name = 'Spare Parts Sales' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

UPDATE item_categories SET sales_account_id = 'bdcae333-b75c-43ee-a8e4-18a4d7be0a05'  -- MISCELLANEOUS INCOME (41106002) — fallback for maintenance
WHERE category_name = 'Maintenance & Repairs' AND company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';


-- ====================================================
-- NCG EXPRESS (7ece7595-8b7b-46de-8bfc-c1e8e0da7513)
-- Separate company with its own transport revenue accounts
-- ====================================================
UPDATE item_categories SET sales_account_id = 'e0e3a6c2-11a7-4f3e-ada2-fc8cb6a28385'  -- SBS - COLLECTION -A (41102001)
WHERE category_name = 'School Bus Revenue' AND company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

UPDATE item_categories SET sales_account_id = 'b75254db-49bd-45a8-9a91-8a21022d6636'  -- SPE.H.INCOME - EXTERNAL (41103002)
WHERE category_name = 'Special Hire Revenue' AND company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

UPDATE item_categories SET sales_account_id = '2ab492ea-0948-48da-9083-1bae12ecfc4e'  -- SPE.H.INCOME - INTERNAL (41103001)
WHERE category_name = 'Staff Transport Revenue' AND company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

UPDATE item_categories SET sales_account_id = '33045d4b-04cb-4ac4-a129-f12052ba0d2e'  -- CALL BOOKING (41101001) — for Yutong bus bookings
WHERE category_name = 'Yutong Sales' AND company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

UPDATE item_categories SET sales_account_id = 'bdcae333-b75c-43ee-a8e4-18a4d7be0a05'  -- MISCELLANEOUS INCOME (41106002)
WHERE category_name IN ('Maintenance & Repairs', 'Spare Parts Sales', 'Sinotruk Sales', 'Light Vehicle Sales')
AND company_id = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';


-- ====================================================
-- SUB-COMPANIES (post to parent NCG Holding GL anyway)
-- Link to their own generic Sales Revenue (4100) as a safe fallback
-- ====================================================

-- Yutong Sales sub-company
UPDATE item_categories SET sales_account_id = 'ee3d4e9c-0a46-4374-8056-800c63a597b2'
WHERE company_id = 'efc37802-e6bf-4426-ab69-fcac84c953b1' AND sales_account_id IS NULL;

-- Sinotruck Sales sub-company
UPDATE item_categories SET sales_account_id = '48bee406-5698-4b11-b72c-91c698d30f9a'
WHERE company_id = 'bfd054c7-2403-4972-9a8a-2599a777a801' AND sales_account_id IS NULL;

-- Light Vehicle Sales sub-company
UPDATE item_categories SET sales_account_id = '83d8d0a3-5f3e-42d8-8781-f0fac7b3aa1c'
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06' AND sales_account_id IS NULL;

-- School Bus Operations sub-company
UPDATE item_categories SET sales_account_id = '3550849d-c36a-4cd4-877e-23d8ff41e3c7'
WHERE company_id = 'ac957087-0224-4149-b231-7aa9e6a3aea1' AND sales_account_id IS NULL;

-- Special Hire sub-company
UPDATE item_categories SET sales_account_id = '4b06f312-656f-40ba-9226-0a306561de54'
WHERE company_id = 'fe7439e7-3dde-47fd-8052-10b9eaf7abe8' AND sales_account_id IS NULL;


-- ====================================================
-- VERIFICATION: Check all links are set
-- ====================================================
SELECT 
  ic.category_name,
  coa.account_code,
  coa.account_name AS linked_revenue_account,
  c.name AS company_name
FROM item_categories ic
LEFT JOIN chart_of_accounts coa ON coa.id = ic.sales_account_id
LEFT JOIN companies c ON c.id = ic.company_id
WHERE ic.category_name IN (
  'Yutong Sales', 'Sinotruk Sales', 'Light Vehicle Sales',
  'Special Hire Revenue', 'School Bus Revenue', 'Staff Transport Revenue',
  'Maintenance & Repairs', 'Spare Parts Sales'
)
ORDER BY c.name, ic.category_name;
