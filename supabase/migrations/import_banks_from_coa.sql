-- Script to import missing Bank Accounts from the Chart of Accounts (COA)
-- This will look for any GL accounts under NCG Holding that are tagged as 'asset'
-- and have 'bank' or 'cash' in the name, and automatically create a Bank Account entry for them.

DO $$ 
DECLARE
    holding_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    INSERT INTO bank_accounts (
        account_code, 
        account_name, 
        account_number, 
        bank_name, 
        company_id, 
        gl_account_id, 
        currency, 
        account_type, 
        is_active,
        business_unit_code
    )
    SELECT 
        c.account_code,
        c.account_name,
        -- Try to extract an account number if it's in the name (e.g., "COMMERCIAL BANK - 1000516089")
        -- If no numbers are found, it defaults to 'PENDING'
        COALESCE(
            SUBSTRING(c.account_name FROM '[0-9]{5,}'), 
            'PENDING'
        ) as account_number,
        -- Try to infer the Bank Name from common Sri Lankan banks
        CASE 
            WHEN c.account_name ILIKE '%COMMERCIAL%' THEN 'Commercial Bank of Ceylon PLC'
            WHEN c.account_name ILIKE '%HNB%' OR c.account_name ILIKE '%HATTON%' THEN 'Hatton National Bank PLC'
            WHEN c.account_name ILIKE '%NTB%' OR c.account_name ILIKE '%NATIONS%' THEN 'Nations Trust Bank PLC'
            WHEN c.account_name ILIKE '%BOC%' OR c.account_name ILIKE '%CEYLON%' THEN 'Bank of Ceylon'
            WHEN c.account_name ILIKE '%SAMPATH%' THEN 'Sampath Bank PLC'
            WHEN c.account_name ILIKE '%SEYLAN%' THEN 'Seylan Bank PLC'
            WHEN c.account_name ILIKE '%NDB%' THEN 'National Development Bank PLC'
            WHEN c.account_name ILIKE '%DFCC%' THEN 'DFCC Bank PLC'
            WHEN c.account_name ILIKE '%PEOPLES%' THEN 'Peoples Bank'
            ELSE 'Unknown Bank'
        END as bank_name,
        c.company_id,
        c.id as gl_account_id,
        'LKR' as currency,
        -- Infer the account type
        CASE 
            WHEN c.account_name ILIKE '%petty%' THEN 'petty_cash'
            WHEN c.account_name ILIKE '%savings%' OR c.account_name ILIKE '%S/A%' THEN 'savings'
            ELSE 'current' 
        END as account_type,
        true as is_active,
        NULL as business_unit_code
    FROM chart_of_accounts c
    WHERE c.company_id = holding_id
      AND c.account_type = 'asset'
      AND (c.account_name ILIKE '%bank%' OR c.account_name ILIKE '%cash%')
      -- Safety Check: Ensure we don't insert duplicates if it's already mapped
      AND NOT EXISTS (
          SELECT 1 FROM bank_accounts ba 
          WHERE ba.gl_account_id = c.id 
             OR ba.account_code = c.account_code
             OR ba.account_name = c.account_name
      );
      
    NOTIFY pgrst, 'reload schema';
END $$;
