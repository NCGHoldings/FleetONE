-- Seed Core Revenue Item Categories (Fixed for unique constraint on category_code)
-- Run this in your Supabase SQL Editor.

DO $$ 
DECLARE
  comp RECORD;
  prefix TEXT;
  comp_count INT := 0;
BEGIN
  FOR comp IN SELECT id, name FROM companies LOOP
    comp_count := comp_count + 1;
    prefix := 'C' || comp_count || '_';
    
    -- 1. Yutong Sales
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'YUTONG', 'Yutong Sales', true)
    ON CONFLICT (category_code) DO NOTHING;

    -- 2. Sinotruk Sales
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'SINOTRUK', 'Sinotruk Sales', true)
    ON CONFLICT (category_code) DO NOTHING;
    
    -- 3. Light Vehicle Sales
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'LVS', 'Light Vehicle Sales', true)
    ON CONFLICT (category_code) DO NOTHING;
    
    -- 4. Special Hire Revenue
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'SPECIAL_HIRE', 'Special Hire Revenue', true)
    ON CONFLICT (category_code) DO NOTHING;

    -- 5. School Bus Revenue
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'SCHOOL_BUS', 'School Bus Revenue', true)
    ON CONFLICT (category_code) DO NOTHING;

    -- 6. Staff Transport Revenue
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'STAFF_TRANSPORT', 'Staff Transport Revenue', true)
    ON CONFLICT (category_code) DO NOTHING;

    -- 7. Maintenance & Repairs Revenue
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'SERVICE', 'Maintenance & Repairs', true)
    ON CONFLICT (category_code) DO NOTHING;

    -- 8. Spare Parts Sales
    INSERT INTO item_categories (company_id, category_code, category_name, is_active)
    VALUES (comp.id, prefix || 'PARTS', 'Spare Parts Sales', true)
    ON CONFLICT (category_code) DO NOTHING;

  END LOOP;
  
  RAISE NOTICE 'Seeded categories for % companies', comp_count;
END $$;
