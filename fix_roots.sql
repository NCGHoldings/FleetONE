DO $$ 
DECLARE
    comp RECORD;
    assets_id UUID;
    liab_id UUID;
    equity_id UUID;
    rev_id UUID;
    exp_id UUID;
BEGIN
    FOR comp IN SELECT id FROM companies LOOP
        -- Get or create ASSETS
        SELECT id INTO assets_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'ASSETS' LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
            VALUES ('10000000', 'ASSETS', 'asset', true, comp.id) RETURNING id INTO assets_id;
        END IF;

        -- Get or create LIABILITIES
        SELECT id INTO liab_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) IN ('LIABILITIES', 'LIABILITY') LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
            VALUES ('20000000', 'LIABILITIES', 'liability', true, comp.id) RETURNING id INTO liab_id;
        END IF;

        -- Get or create EQUITY
        SELECT id INTO equity_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'EQUITY' LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
            VALUES ('30000000', 'EQUITY', 'equity', true, comp.id) RETURNING id INTO equity_id;
        END IF;

        -- Get or create REVENUE
        SELECT id INTO rev_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'REVENUE' LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
            VALUES ('40000000', 'REVENUE', 'revenue', true, comp.id) RETURNING id INTO rev_id;
        END IF;

        -- Get or create EXPENDITURE / EXPENSE
        SELECT id INTO exp_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) IN ('EXPENDITURE', 'EXPENSES', 'EXPENSE') LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
            VALUES ('50000000', 'EXPENDITURE', 'expense', true, comp.id) RETURNING id INTO exp_id;
        END IF;

        -- Move all floating asset accounts
        UPDATE chart_of_accounts 
        SET parent_account_id = assets_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND id != assets_id AND account_type = 'asset';

        -- Move all floating liability accounts
        UPDATE chart_of_accounts 
        SET parent_account_id = liab_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND id != liab_id AND account_type = 'liability';

        -- Move all floating equity accounts
        UPDATE chart_of_accounts 
        SET parent_account_id = equity_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND id != equity_id AND account_type = 'equity';

        -- Move all floating revenue accounts
        UPDATE chart_of_accounts 
        SET parent_account_id = rev_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND id != rev_id AND account_type = 'revenue';

        -- Move all floating expense accounts
        UPDATE chart_of_accounts 
        SET parent_account_id = exp_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND id != exp_id AND account_type = 'expense';

    END LOOP;
END $$;

-- Force recalculation
UPDATE chart_of_accounts SET account_name = account_name;
