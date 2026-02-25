
CREATE OR REPLACE FUNCTION public.force_delete_coa_for_company(p_company_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_ids UUID[];
  v_deleted_accounts INT := 0;
  v_deleted_linked INT := 0;
  v_tmp INT;
BEGIN
  -- Collect all account IDs for this company
  SELECT ARRAY_AGG(id) INTO v_account_ids
  FROM chart_of_accounts
  WHERE company_id = p_company_id;

  IF v_account_ids IS NULL OR array_length(v_account_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deleted_accounts', 0, 'deleted_linked', 0);
  END IF;

  -- 1. Delete journal_entry_lines referencing these accounts
  DELETE FROM journal_entry_lines WHERE account_id = ANY(v_account_ids);
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted_linked := v_deleted_linked + v_tmp;

  -- 2. Delete journal_entries for this company (now safe since lines are gone)
  DELETE FROM journal_entries WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted_linked := v_deleted_linked + v_tmp;

  -- 3. Delete budget_line_items
  DELETE FROM budget_line_items WHERE account_id = ANY(v_account_ids);
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted_linked := v_deleted_linked + v_tmp;

  -- 4. Delete ap_invoice_lines
  DELETE FROM ap_invoice_lines WHERE account_id = ANY(v_account_ids);
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted_linked := v_deleted_linked + v_tmp;

  -- 5. Delete ar_invoice_lines
  DELETE FROM ar_invoice_lines WHERE account_id = ANY(v_account_ids);
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_deleted_linked := v_deleted_linked + v_tmp;

  -- 6. Nullify accounts_payable.account_id
  UPDATE accounts_payable SET account_id = NULL WHERE account_id = ANY(v_account_ids);

  -- 7. Nullify accounts_receivable.account_id
  UPDATE accounts_receivable SET account_id = NULL WHERE account_id = ANY(v_account_ids);

  -- 8. Delete auto_posting_rules
  DELETE FROM auto_posting_rules WHERE company_id = p_company_id;

  -- 9. Nullify asset_categories account references
  UPDATE asset_categories SET
    asset_account_id = NULL,
    accumulated_dep_account_id = NULL,
    depreciation_expense_account_id = NULL,
    gain_loss_disposal_account_id = NULL,
    revaluation_surplus_account_id = NULL,
    bank_account_id = NULL
  WHERE company_id = p_company_id;

  -- 10. Nullify bank_accounts.gl_account_id
  UPDATE bank_accounts SET gl_account_id = NULL WHERE company_id = p_company_id AND gl_account_id IS NOT NULL;

  -- 11. Nullify gl_settings account references
  UPDATE gl_settings SET
    default_cash_account_id = NULL,
    default_bank_account_id = NULL,
    retained_earnings_account_id = NULL,
    suspense_account_id = NULL,
    exchange_gain_loss_account_id = NULL
  WHERE company_id = p_company_id;

  -- 12. Nullify school_bus_finance_settings account references
  UPDATE school_bus_finance_settings SET
    advance_payments_liability_account_id = NULL,
    branch_gl_account_id = NULL,
    cash_account_id = NULL,
    expense_account_id = NULL,
    expense_cash_account_id = NULL,
    fuel_bank_account_id = NULL,
    fuel_expense_account_id = NULL,
    maintenance_expense_account_id = NULL,
    salary_expense_account_id = NULL,
    sbs_collection_account_id = NULL,
    trade_receivable_account_id = NULL
  WHERE company_id = p_company_id;

  -- 13. Nullify leasing_finance_settings if exists
  BEGIN
    UPDATE leasing_finance_settings SET
      ar_account_id = NULL
    WHERE company_id = p_company_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 14. Nullify cashbook_entries.account_id if exists
  BEGIN
    UPDATE cashbook_entries SET account_id = NULL WHERE account_id = ANY(v_account_ids);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 15. Nullify inter_company_transfers references
  BEGIN
    UPDATE inter_company_transfers SET from_gl_account_id = NULL WHERE from_gl_account_id = ANY(v_account_ids);
    UPDATE inter_company_transfers SET to_gl_account_id = NULL WHERE to_gl_account_id = ANY(v_account_ids);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 16. Nullify inventory_settings references
  BEGIN
    UPDATE inventory_settings SET
      inventory_account_id = NULL,
      cogs_account_id = NULL,
      sales_account_id = NULL
    WHERE company_id = p_company_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- 17. Nullify chart_of_accounts parent_account_id self-references
  UPDATE chart_of_accounts SET parent_account_id = NULL WHERE company_id = p_company_id AND parent_account_id IS NOT NULL;

  -- 18. Delete ALL chart_of_accounts for company
  DELETE FROM chart_of_accounts WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_deleted_accounts = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_accounts', v_deleted_accounts,
    'deleted_linked', v_deleted_linked
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;
