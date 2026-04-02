
-- Create LIVE item categories for NCG Holding (a0000000-0000-0000-0000-000000000001)
INSERT INTO item_categories (category_code, category_name, company_id, sales_account_id, is_active)
VALUES
  ('L1_YUTONG', 'Yutong Sales', 'a0000000-0000-0000-0000-000000000001', '90496af6-a055-40da-98c0-49aeb8e28a0e', true),
  ('L1_SINOTRUK', 'Sinotruk Sales', 'a0000000-0000-0000-0000-000000000001', '7e45beac-797d-4ee7-a4f7-39b013a0cb58', true),
  ('L1_LVS', 'Light Vehicle Sales', 'a0000000-0000-0000-0000-000000000001', '2f5229a1-c5db-4a67-ac22-909b3d9c816b', true),
  ('L1_SCHOOL_BUS', 'School Bus Revenue', 'a0000000-0000-0000-0000-000000000001', '753cb8f4-23bb-4648-a846-5c2c37f44ec8', true),
  ('L1_STAFF_TRANSPORT', 'Staff Transport Revenue', 'a0000000-0000-0000-0000-000000000001', '51f1c30d-1bb8-4056-b423-82ced47ba3b0', true),
  ('L1_SPECIAL_HIRE', 'Special Hire Revenue', 'a0000000-0000-0000-0000-000000000001', 'd28e31b7-52b9-45ad-85aa-e75e7661bad9', true),
  ('L1_PARTS', 'Spare Parts Sales', 'a0000000-0000-0000-0000-000000000001', 'b6800d0d-b4ce-404a-8118-b21bfed15cfc', true),
  ('L1_SERVICE', 'Maintenance & Repairs', 'a0000000-0000-0000-0000-000000000001', 'b6800d0d-b4ce-404a-8118-b21bfed15cfc', true);

-- Update old test sub-company categories to point to TEST COA accounts (f40b0a9d...)
-- C1_ (Test School Bus = 0fba4a2f...) → map to TEST COA
UPDATE item_categories SET sales_account_id = 'c4414657-5840-4c75-b3f3-5da325b45380' WHERE id = 'b6abcf6b-059f-4152-b61f-c9c0497e637a'; -- C1_YUTONG → 41101001
UPDATE item_categories SET sales_account_id = '886a6cc1-eb64-4183-9680-11677d01843e' WHERE id = '4e924166-50e6-4176-8862-50da5300dc9d'; -- C1_SINOTRUK → 41101002
UPDATE item_categories SET sales_account_id = '2fe31145-ac31-44f8-9117-7d472582a58d' WHERE id = 'de25ef8e-6be0-4f93-9654-4a04bb72a9d2'; -- C1_LVS → 41101003
UPDATE item_categories SET sales_account_id = '19891c60-a0ac-46f1-939d-15eb1bf88fba' WHERE id = '386d32b1-6af1-4e11-a6ab-2c6044325589'; -- C1_SCHOOL_BUS → 41103001
UPDATE item_categories SET sales_account_id = 'c8aca1b8-9fa1-4b59-ae3f-632505289a29' WHERE id = '04c39e04-c770-4acd-a599-21089cbdf44f'; -- C1_STAFF_TRANSPORT → 41103002
UPDATE item_categories SET sales_account_id = '168235e9-9618-4346-a34e-3e2f9ed663f0' WHERE id = 'c7b47e14-c98d-423c-9e09-ea43640d08aa'; -- C1_SPECIAL_HIRE → 41103003
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = '7b0e8814-9151-42ae-90ce-b0591371b9d9'; -- C1_PARTS → 41104004
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = '8faff20b-21d6-4f18-b040-f4ac27b2bfe7'; -- C1_SERVICE → 41104004

-- C2_ (Test Special Hire = bfd054c7...)
UPDATE item_categories SET sales_account_id = 'c4414657-5840-4c75-b3f3-5da325b45380' WHERE id = '8bc4f38e-f986-4102-b589-247721da761a'; -- C2_YUTONG
UPDATE item_categories SET sales_account_id = '886a6cc1-eb64-4183-9680-11677d01843e' WHERE id = 'cc297665-8bea-40be-bc79-ae08abdd93bb'; -- C2_SINOTRUK
UPDATE item_categories SET sales_account_id = '2fe31145-ac31-44f8-9117-7d472582a58d' WHERE id = 'ad285098-8d29-481a-9446-ac651ace97d6'; -- C2_LVS
UPDATE item_categories SET sales_account_id = '19891c60-a0ac-46f1-939d-15eb1bf88fba' WHERE id = 'eaa02e6a-67b2-4817-8a42-d7bf82928431'; -- C2_SCHOOL_BUS
UPDATE item_categories SET sales_account_id = 'c8aca1b8-9fa1-4b59-ae3f-632505289a29' WHERE id = '6022b3be-94c7-4df4-9962-57c498a6f171'; -- C2_STAFF_TRANSPORT
UPDATE item_categories SET sales_account_id = '168235e9-9618-4346-a34e-3e2f9ed663f0' WHERE id = '8091ca04-9a10-4545-b6f8-659d1ee5438d'; -- C2_SPECIAL_HIRE
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = '5155b9cf-fe00-41ec-93cd-e9b84807747a'; -- C2_PARTS
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = '0f33f8dc-3189-4625-ae6d-da991c3f1681'; -- C2_SERVICE

-- C3_ (Test Light Vehicle = ac957087...)
UPDATE item_categories SET sales_account_id = 'c4414657-5840-4c75-b3f3-5da325b45380' WHERE id = '7308e506-3095-46ce-9440-60b958473308'; -- C3_YUTONG
UPDATE item_categories SET sales_account_id = '886a6cc1-eb64-4183-9680-11677d01843e' WHERE id = 'b67deb62-c0a3-4a42-a051-3333c294eb7e'; -- C3_SINOTRUK
UPDATE item_categories SET sales_account_id = '2fe31145-ac31-44f8-9117-7d472582a58d' WHERE id = 'a1208150-b3e1-4a0d-9ff9-4fd5e4f1ce1c'; -- C3_LVS
UPDATE item_categories SET sales_account_id = '19891c60-a0ac-46f1-939d-15eb1bf88fba' WHERE id = '4d45ad23-587c-493b-a511-8ca849ee1304'; -- C3_SCHOOL_BUS
UPDATE item_categories SET sales_account_id = 'c8aca1b8-9fa1-4b59-ae3f-632505289a29' WHERE id = '2be66036-6245-4740-9eb3-97959108a663'; -- C3_STAFF_TRANSPORT
UPDATE item_categories SET sales_account_id = '168235e9-9618-4346-a34e-3e2f9ed663f0' WHERE id = '49df8245-7b7c-4397-bd9c-bedcfdb4ea63'; -- C3_SPECIAL_HIRE
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = 'fa8173d6-37fa-4083-8eb2-f255124197fd'; -- C3_PARTS
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = '11d1e59e-777d-424e-9bce-3d85b7250a46'; -- C3_SERVICE

-- C6_ (Test Yutong = efc37802...)
UPDATE item_categories SET sales_account_id = 'c4414657-5840-4c75-b3f3-5da325b45380' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_YUTONG');
UPDATE item_categories SET sales_account_id = '886a6cc1-eb64-4183-9680-11677d01843e' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_SINOTRUK');
UPDATE item_categories SET sales_account_id = '2fe31145-ac31-44f8-9117-7d472582a58d' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_LVS');
UPDATE item_categories SET sales_account_id = '19891c60-a0ac-46f1-939d-15eb1bf88fba' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_SCHOOL_BUS');
UPDATE item_categories SET sales_account_id = 'c8aca1b8-9fa1-4b59-ae3f-632505289a29' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_STAFF_TRANSPORT');
UPDATE item_categories SET sales_account_id = '168235e9-9618-4346-a34e-3e2f9ed663f0' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_SPECIAL_HIRE');
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_PARTS');
UPDATE item_categories SET sales_account_id = '0d58477a-9035-4c0c-982a-93a316a1b462' WHERE id = (SELECT id FROM item_categories WHERE category_code = 'C6_SERVICE');
