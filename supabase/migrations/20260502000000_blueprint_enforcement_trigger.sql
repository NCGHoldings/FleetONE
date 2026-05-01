-- Migration to strictly enforce the "School Bus" Blueprint mapping at the database layer

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
BEGIN
  -- We only validate lines during INSERT where we know the parent journal entry
  SELECT source_module, business_unit_id, company_id 
  INTO v_module, v_branch_id, v_company_id
  FROM journal_entries 
  WHERE id = NEW.journal_entry_id;

  -- Only enforce for school_bus module
  IF v_module = 'school_bus' THEN
    
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

    -- 2. Fetch the global suspense account (for overrides)
    SELECT suspense_account_id
    INTO v_suspense_account
    FROM finance_settings
    WHERE company_id = v_company_id
    LIMIT 1;

    -- 3. Assert the account used in the journal line is one of the permitted blueprint nodes
    IF NEW.account_id NOT IN (
      v_trade_receivable,
      v_sbs_collection,
      v_branch_bank,
      v_suspense_account
    ) THEN
      RAISE EXCEPTION 'BLUEPRINT INTEGRITY BREACH: Attempted to post School Bus transaction to unauthorized GL Account %.', NEW.account_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to journal_entry_lines
DROP TRIGGER IF EXISTS trg_enforce_school_bus_blueprint ON journal_entry_lines;
CREATE TRIGGER trg_enforce_school_bus_blueprint
BEFORE INSERT ON journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION enforce_school_bus_blueprint();
