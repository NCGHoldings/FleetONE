DO $$ 
DECLARE
    v_holding_id UUID;
    v_cash_equiv_id UUID;
    v_cash_at_bank_id UUID;
    v_cash_equiv_record RECORD;
BEGIN
    -- 1. Get NCG Holdings Company ID
    SELECT id INTO v_holding_id FROM companies WHERE name ILIKE '%NCG Holding%' LIMIT 1;
    
    IF v_holding_id IS NULL THEN
        RAISE EXCEPTION 'Could not find NCG Holding company';
    END IF;

    -- 2. Find the "CASH & CASH EQUIVALENTS" account ID
    SELECT * INTO v_cash_equiv_record 
    FROM chart_of_accounts 
    WHERE company_id = v_holding_id 
      AND account_name ILIKE '%CASH & CASH EQUIVALENTS%' 
    LIMIT 1;

    v_cash_equiv_id := v_cash_equiv_record.id;

    -- 3. Create "CASH AT BANK" Header Account if it doesn't exist
    SELECT id INTO v_cash_at_bank_id
    FROM chart_of_accounts
    WHERE company_id = v_holding_id
      AND account_name = 'CASH AT BANK'
      AND is_header = true
    LIMIT 1;

    IF v_cash_at_bank_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_type,
            is_active,
            is_header,
            description,
            parent_account_id,
            level1,
            level2,
            level3,
            level4,
            account_level
        ) VALUES (
            v_holding_id,
            '13001000',
            'CASH AT BANK',
            'asset',
            true,
            true,
            'Auto-created Header Account for Bank Accounts',
            v_cash_equiv_id,
            v_cash_equiv_record.level1,
            v_cash_equiv_record.level2,
            v_cash_equiv_record.level3,
            'CASH AT BANK',
            4
        ) RETURNING id INTO v_cash_at_bank_id;
    ELSE
        -- Ensure it is under CASH & CASH EQUIVALENTS with proper levels
        UPDATE chart_of_accounts 
        SET parent_account_id = v_cash_equiv_id,
            level1 = v_cash_equiv_record.level1,
            level2 = v_cash_equiv_record.level2,
            level3 = v_cash_equiv_record.level3,
            level4 = 'CASH AT BANK',
            level5 = NULL,
            account_level = 4
        WHERE id = v_cash_at_bank_id;
    END IF;

    -- 4. Move all Asset Bank Accounts (Level 5) under the new CASH AT BANK folder
    UPDATE chart_of_accounts
    SET parent_account_id = v_cash_at_bank_id,
        level1 = v_cash_equiv_record.level1,
        level2 = v_cash_equiv_record.level2,
        level3 = v_cash_equiv_record.level3,
        level4 = 'CASH AT BANK',
        level5 = account_name,
        account_level = 5
    WHERE company_id = v_holding_id
      AND account_name ILIKE '%BANK%'
      AND account_type = 'asset'
      AND is_header = false
      AND id != v_cash_at_bank_id;

    NOTIFY pgrst, 'reload schema';
END $$;
