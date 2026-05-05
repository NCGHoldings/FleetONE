-- Migration to allow valid manual overrides while enforcing the "School Bus" Blueprint mapping
-- at the database layer. FIXED: Query gl_settings instead of non-existent finance_settings.

CREATE OR REPLACE FUNCTION enforce_school_bus_blueprint()
RETURNS TRIGGER AS $$
DECLARE
  v_module TEXT;
  v_branch_id UUID;
  v_company_id UUID;
  v_trade_receivable UUID;
  v_sbs_collection UUID;
  v_branch_bank UUID;
  v_suspense_account UUID;
  v_is_valid_override BOOLEAN;
BEGIN
  -- We only validate lines during INSERT where we know the parent journal entry
  SELECT source_module, business_unit_id, company_id 
  INTO v_module, v_branch_id, v_company_id
  FROM journal_entries 
  WHERE id = NEW.journal_entry_id;

  -- Re-query to get business_unit_code
  IF v_module = 'school_bus' OR EXISTS (SELECT 1 FROM journal_entries WHERE id = NEW.journal_entry_id AND business_unit_code = 'SBO') THEN
    
    -- 1. Fetch the exact settings for this branch/company
    SELECT 
      trade_receivable_account_id,
      sbs_collection_account_id,
      branch_gl_account_id
    INTO 
      v_trade_receivable, 
      v_sbs_collection,
      v_branch_bank
    FROM school_bus_finance_settings
    WHERE (branch_id = v_branch_id OR branch_id IS NULL)
      AND company_id = v_company_id
    ORDER BY branch_id NULLS LAST
    LIMIT 1;

    -- 2. Fetch the global suspense account (changed from finance_settings to gl_settings)
    SELECT suspense_account_id
    INTO v_suspense_account
    FROM gl_settings
    WHERE company_id = v_company_id
    LIMIT 1;

    -- 3. Assert the account used in the journal line is one of the permitted blueprint nodes
    IF NEW.account_id NOT IN (
      v_trade_receivable,
      v_sbs_collection,
      v_branch_bank,
      v_suspense_account
    ) THEN
      -- 4. NEW: If it is not one of the exactly defined 4 accounts, check if it is a valid
      -- manual override from the company's chart of accounts (asset or liability).
      SELECT EXISTS (
        SELECT 1 FROM chart_of_accounts
        WHERE id = NEW.account_id
          AND company_id = v_company_id
          AND account_type IN ('asset', 'liability', 'equity', 'expense', 'revenue')
          AND is_active = true
      ) INTO v_is_valid_override;

      IF NOT v_is_valid_override THEN
        RAISE EXCEPTION 'BLUEPRINT INTEGRITY BREACH: Attempted to post School Bus transaction to unauthorized GL Account %.', NEW.account_id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
