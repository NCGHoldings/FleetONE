-- Sync script to correctly map existing Bank Accounts to the consolidated GL architecture
-- This fixes the issue where bank accounts created under sub-companies are invisible to the parent company.
DO $$ 
DECLARE
    holding_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Identify bank accounts that belong to sub-companies of NCG Holding
    -- 2. Move them to the parent company (NCG Holding)
    -- 3. Tag them with the appropriate business_unit_code so they still appear in sub-company views
    
    UPDATE bank_accounts ba
    SET 
        business_unit_code = COALESCE(
            ba.business_unit_code, -- Keep if already set
            c.short_code,          -- Use short_code from companies table
            CASE                   -- Fallback inference if short_code is missing
                WHEN c.name ILIKE '%school bus%' THEN 'SBO'
                WHEN c.name ILIKE '%special hire%' THEN 'SPH'
                WHEN c.name ILIKE '%yutong%' THEN 'YUT'
                WHEN c.name ILIKE '%sinotruk%' OR c.name ILIKE '%sinotruck%' THEN 'SNT'
                WHEN c.name ILIKE '%light vehicle%' THEN 'LTV'
                ELSE NULL
            END
        ),
        company_id = holding_id
    FROM companies c
    WHERE ba.company_id = c.id
      AND c.parent_company_id = holding_id;
      
    -- Notify PostgREST to reload schema cache just in case
    NOTIFY pgrst, 'reload schema';
END $$;
