-- Robust Sync Script for Bank Accounts & Transactions
-- This script moves bank accounts and transactions from sub-companies (like School Bus) 
-- into the NCG Holding parent entity and tags them with the correct business_unit_code.

DO $$ 
DECLARE
    holding_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Ensure business_unit_code exists
    ALTER TABLE IF EXISTS public.bank_accounts ADD COLUMN IF NOT EXISTS business_unit_code text;
    ALTER TABLE IF EXISTS public.bank_transactions ADD COLUMN IF NOT EXISTS business_unit_code text;
    ALTER TABLE IF EXISTS public.bank_reconciliations ADD COLUMN IF NOT EXISTS business_unit_code text;

    -- 2. Find the actual NCG Holding ID from the database if the hardcoded one is wrong
    SELECT id INTO holding_id FROM companies WHERE name ILIKE '%NCG Holding%' LIMIT 1;
    
    IF holding_id IS NULL THEN
        RAISE NOTICE 'NCG Holding company not found!';
        RETURN;
    END IF;

    -- 3. Move Bank Accounts to NCG Holding and set business_unit_code
    UPDATE bank_accounts ba
    SET 
        business_unit_code = CASE
            WHEN c.name ILIKE '%school bus%' THEN 'SBO'
            WHEN c.name ILIKE '%special hire%' THEN 'SPH'
            WHEN c.name ILIKE '%yutong%' THEN 'YUT'
            WHEN c.name ILIKE '%sinotruk%' OR c.name ILIKE '%sinotruck%' THEN 'SNT'
            WHEN c.name ILIKE '%light vehicle%' THEN 'LTV'
            ELSE COALESCE(c.short_code, ba.business_unit_code)
        END,
        company_id = holding_id
    FROM companies c
    WHERE ba.company_id = c.id
      AND c.id != holding_id
      AND (
          c.parent_company_id = holding_id OR 
          c.name ILIKE '%school bus%' OR 
          c.name ILIKE '%special hire%' OR 
          c.name ILIKE '%yutong%' OR 
          c.name ILIKE '%sinotruk%' OR 
          c.name ILIKE '%light vehicle%'
      );

    -- 4. Move Bank Transactions to NCG Holding and set business_unit_code
    UPDATE bank_transactions bt
    SET 
        business_unit_code = CASE
            WHEN c.name ILIKE '%school bus%' THEN 'SBO'
            WHEN c.name ILIKE '%special hire%' THEN 'SPH'
            WHEN c.name ILIKE '%yutong%' THEN 'YUT'
            WHEN c.name ILIKE '%sinotruk%' OR c.name ILIKE '%sinotruck%' THEN 'SNT'
            WHEN c.name ILIKE '%light vehicle%' THEN 'LTV'
            ELSE COALESCE(c.short_code, bt.business_unit_code)
        END,
        company_id = holding_id
    FROM companies c
    WHERE bt.company_id = c.id
      AND c.id != holding_id
      AND (
          c.parent_company_id = holding_id OR 
          c.name ILIKE '%school bus%' OR 
          c.name ILIKE '%special hire%' OR 
          c.name ILIKE '%yutong%' OR 
          c.name ILIKE '%sinotruk%' OR 
          c.name ILIKE '%light vehicle%'
      );

    -- 5. Move Bank Reconciliations
    UPDATE bank_reconciliations br
    SET 
        business_unit_code = CASE
            WHEN c.name ILIKE '%school bus%' THEN 'SBO'
            WHEN c.name ILIKE '%special hire%' THEN 'SPH'
            WHEN c.name ILIKE '%yutong%' THEN 'YUT'
            WHEN c.name ILIKE '%sinotruk%' OR c.name ILIKE '%sinotruck%' THEN 'SNT'
            WHEN c.name ILIKE '%light vehicle%' THEN 'LTV'
            ELSE COALESCE(c.short_code, br.business_unit_code)
        END,
        company_id = holding_id
    FROM companies c
    WHERE br.company_id = c.id
      AND c.id != holding_id
      AND (
          c.parent_company_id = holding_id OR 
          c.name ILIKE '%school bus%' OR 
          c.name ILIKE '%special hire%' OR 
          c.name ILIKE '%yutong%' OR 
          c.name ILIKE '%sinotruk%' OR 
          c.name ILIKE '%light vehicle%'
      );

    -- Refresh schema cache
    NOTIFY pgrst, 'reload schema';
END $$;
