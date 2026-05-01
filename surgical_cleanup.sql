DO $$ 
DECLARE
    comp RECORD;
    assets_id UUID;
    equity_id UUID;
    bad_asset_id UUID;
    bad_opening_id UUID;
BEGIN
    FOR comp IN SELECT id FROM companies LOOP
        -- 1. Find the main ASSETS and EQUITY folders
        SELECT id INTO assets_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'ASSETS' LIMIT 1;
        SELECT id INTO equity_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'EQUITY' LIMIT 1;

        -- 2. Find the floating 'asset' and 'OPENING BALANCE' folders
        SELECT id INTO bad_asset_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND account_name = 'asset' LIMIT 1;
        SELECT id INTO bad_opening_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'OPENING BALANCE' LIMIT 1;

        -- 3. MOVE the 'asset' folder inside ASSETS (DO NOT DELETE IT)
        IF bad_asset_id IS NOT NULL AND assets_id IS NOT NULL THEN
            UPDATE chart_of_accounts 
            SET parent_account_id = assets_id, level1 = 'ASSETS', level2 = account_name 
            WHERE id = bad_asset_id;
            
            -- Fix the UI folders for its children
            UPDATE chart_of_accounts SET level1 = 'ASSETS' WHERE level1 = 'asset' AND id != bad_asset_id;
        END IF;

        -- 4. MOVE the 'OPENING BALANCE' folder inside EQUITY (DO NOT DELETE IT)
        IF bad_opening_id IS NOT NULL AND equity_id IS NOT NULL THEN
            UPDATE chart_of_accounts 
            SET parent_account_id = equity_id, level1 = 'EQUITY', level2 = account_name 
            WHERE id = bad_opening_id;
            
            -- Fix the UI folders for its children
            UPDATE chart_of_accounts SET level1 = 'EQUITY' WHERE level1 = 'OPENING BALANCE' AND id != bad_opening_id;
        END IF;

    END LOOP;
END $$;
