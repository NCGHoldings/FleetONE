-- Seed Core Revenue Item Categories
-- This script safely injects the default revenue categories across all active companies.
-- Run this in your Supabase SQL Editor.

DO $$ 
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies LOOP
    
    -- 1. Yutong Sales
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Yutong Sales') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'YUTONG', 'Yutong Sales', true);
    END IF;

    -- 2. Sinotruk Sales
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Sinotruk Sales') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'SINOTRUK', 'Sinotruk Sales', true);
    END IF;
    
    -- 3. Light Vehicle Sales
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Light Vehicle Sales') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'LVS', 'Light Vehicle Sales', true);
    END IF;
    
    -- 4. Special Hire Revenue
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Special Hire Revenue') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'SPECIAL_HIRE', 'Special Hire Revenue', true);
    END IF;

    -- 5. School Bus Revenue
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'School Bus Revenue') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'SCHOOL_BUS', 'School Bus Revenue', true);
    END IF;

    -- 6. Staff Transport Revenue
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Staff Transport Revenue') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'STAFF_TRANSPORT', 'Staff Transport Revenue', true);
    END IF;

    -- 7. Maintenance & Repairs Revenue
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Maintenance & Repairs') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'SERVICE', 'Maintenance & Repairs', true);
    END IF;

    -- 8. Spare Parts Sales
    IF NOT EXISTS (SELECT 1 FROM item_categories WHERE company_id = comp.id AND category_name = 'Spare Parts Sales') THEN
      INSERT INTO item_categories (company_id, category_code, category_name, is_active)
      VALUES (comp.id, 'PARTS', 'Spare Parts Sales', true);
    END IF;

  END LOOP;
END $$;
