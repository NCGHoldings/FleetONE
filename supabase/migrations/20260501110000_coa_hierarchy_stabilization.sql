-- Migration: Chart of Accounts Hierarchy Stabilization
-- Created: 2026-05-01
-- Purpose: 
-- 1. Create self-healing triggers to strictly enforce level1-level5 hierarchy based on parent_account_id.
-- 2. Cascade hierarchy changes downwards automatically.
-- 3. Clean up the corrupted root level (e.g. "asset", "OPENING BALANCE").
-- 4. Re-parent floating bank accounts under ASSETS > Current Assets > Cash and Cash Equivalents > Cash at Bank.

-- Part 1: The Self-Healing Hierarchy Triggers
CREATE OR REPLACE FUNCTION maintain_coa_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_record RECORD;
BEGIN
    IF NEW.parent_account_id IS NULL THEN
        -- It's a root node
        NEW.level1 := NEW.account_name;
        NEW.level2 := NULL;
        NEW.level3 := NULL;
        NEW.level4 := NULL;
        NEW.level5 := NULL;
        NEW.account_level := 1;
    ELSE
        -- Fetch parent
        SELECT * INTO parent_record FROM chart_of_accounts WHERE id = NEW.parent_account_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent account not found';
        END IF;

        NEW.level1 := parent_record.level1;
        NEW.level2 := parent_record.level2;
        NEW.level3 := parent_record.level3;
        NEW.level4 := parent_record.level4;
        NEW.level5 := parent_record.level5;
        
        -- Assign the new account to the next available level
        NEW.account_level := LEAST(parent_record.account_level + 1, 5);
        
        IF NEW.account_level = 2 THEN
            NEW.level2 := NEW.account_name;
            NEW.level3 := NULL;
            NEW.level4 := NULL;
            NEW.level5 := NULL;
        ELSIF NEW.account_level = 3 THEN
            NEW.level3 := NEW.account_name;
            NEW.level4 := NULL;
            NEW.level5 := NULL;
        ELSIF NEW.account_level = 4 THEN
            NEW.level4 := NEW.account_name;
            NEW.level5 := NULL;
        ELSIF NEW.account_level = 5 THEN
            NEW.level5 := NEW.account_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maintain_coa_hierarchy ON chart_of_accounts;

CREATE TRIGGER trg_maintain_coa_hierarchy
BEFORE INSERT OR UPDATE OF parent_account_id, account_name
ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION maintain_coa_hierarchy();


CREATE OR REPLACE FUNCTION cascade_coa_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Only cascade if my level paths actually changed
    IF (OLD.level1 IS DISTINCT FROM NEW.level1 OR 
        OLD.level2 IS DISTINCT FROM NEW.level2 OR 
        OLD.level3 IS DISTINCT FROM NEW.level3 OR 
        OLD.level4 IS DISTINCT FROM NEW.level4 OR 
        OLD.level5 IS DISTINCT FROM NEW.level5) THEN
        
        -- Touching the children's account_name (setting it to itself) will fire their BEFORE trigger, 
        -- causing a recursive cascade down the tree!
        UPDATE chart_of_accounts 
        SET account_name = account_name 
        WHERE parent_account_id = NEW.id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cascade_coa_hierarchy ON chart_of_accounts;

CREATE TRIGGER trg_cascade_coa_hierarchy
AFTER UPDATE OF level1, level2, level3, level4, level5
ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION cascade_coa_hierarchy();

-- Part 2: Data Cleanup & Standardization
DO $$ 
DECLARE
    comp RECORD;
    assets_id UUID;
    curr_assets_id UUID;
    cash_equiv_id UUID;
    cash_bank_id UUID;
    equity_id UUID;
BEGIN
    FOR comp IN SELECT id FROM companies LOOP
        -- Ensure ASSETS root exists
        SELECT id INTO assets_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'ASSETS' LIMIT 1;
        IF NOT FOUND THEN
            -- Might be lower case 'asset', fix it
            UPDATE chart_of_accounts SET account_name = 'ASSETS' WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'ASSET';
            SELECT id INTO assets_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'ASSETS' LIMIT 1;
            
            IF NOT FOUND THEN
                INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
                VALUES ('10000000', 'ASSETS', 'asset', true, comp.id) RETURNING id INTO assets_id;
            END IF;
        END IF;

        -- Fix any remaining 'asset' or similar weird roots by re-parenting them to ASSETS
        UPDATE chart_of_accounts 
        SET parent_account_id = assets_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND id != assets_id AND account_type = 'asset';

        -- Ensure EQUITY exists and fix OPENING BALANCE
        SELECT id INTO equity_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'EQUITY' LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, company_id)
            VALUES ('30000000', 'EQUITY', 'equity', true, comp.id) RETURNING id INTO equity_id;
        END IF;

        UPDATE chart_of_accounts 
        SET parent_account_id = equity_id 
        WHERE company_id = comp.id AND parent_account_id IS NULL AND upper(account_name) = 'OPENING BALANCE';

        -- Build the Cash at Bank Hierarchy
        SELECT id INTO curr_assets_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id = assets_id AND upper(account_name) = 'CURRENT ASSETS' LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, parent_account_id, company_id)
            VALUES ('11000000', 'Current Assets', 'asset', true, assets_id, comp.id) RETURNING id INTO curr_assets_id;
        END IF;

        SELECT id INTO cash_equiv_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id = curr_assets_id AND upper(account_name) IN ('CASH AND CASH EQUIVALENTS', 'CASH & CASH EQUIVALENTS') LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, parent_account_id, company_id)
            VALUES ('11100000', 'Cash and Cash Equivalents', 'asset', true, curr_assets_id, comp.id) RETURNING id INTO cash_equiv_id;
        END IF;

        SELECT id INTO cash_bank_id FROM chart_of_accounts WHERE company_id = comp.id AND parent_account_id = cash_equiv_id AND upper(account_name) = 'CASH AT BANK' LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_header, parent_account_id, company_id)
            VALUES ('11110000', 'Cash at Bank', 'asset', true, cash_equiv_id, comp.id) RETURNING id INTO cash_bank_id;
        END IF;

        -- Find floating banks and put them under Cash at Bank
        -- A bank is something in chart_of_accounts that is mapped to the bank_accounts table, OR has 'Bank' in its name.
        UPDATE chart_of_accounts 
        SET parent_account_id = cash_bank_id
        WHERE company_id = comp.id 
          AND id != cash_bank_id 
          AND (id IN (SELECT gl_account_id FROM bank_accounts WHERE gl_account_id IS NOT NULL));

    END LOOP;
END $$;

-- Part 3: Force a global recalculation to ensure the entire tree strings (level1-5) are perfectly in sync with parent_account_ids
UPDATE chart_of_accounts SET account_name = account_name;
