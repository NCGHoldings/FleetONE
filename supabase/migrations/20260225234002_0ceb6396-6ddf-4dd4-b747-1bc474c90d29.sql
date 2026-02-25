
CREATE OR REPLACE FUNCTION public.force_delete_coa_for_company(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_ids uuid[];
  v_journal_ids uuid[];
  v_deleted_accounts int := 0;
  v_linked_cleared int := 0;
  v_phase text := 'init';
  r record;
  v_affected int;
BEGIN
  -- Phase 1: Collect IDs
  v_phase := 'collect_account_ids';
  SELECT array_agg(id) INTO v_account_ids
  FROM chart_of_accounts WHERE company_id = p_company_id;
  
  IF v_account_ids IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deleted_accounts', 0, 'deleted_linked', 0, 'message', 'No accounts found for company');
  END IF;

  v_phase := 'collect_journal_ids';
  SELECT array_agg(id) INTO v_journal_ids
  FROM journal_entries WHERE company_id = p_company_id;

  -- Phase 2: Delete journal_entry_lines by account_id
  v_phase := 'delete_journal_entry_lines';
  DELETE FROM journal_entry_lines WHERE account_id = ANY(v_account_ids);
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  v_linked_cleared := v_linked_cleared + v_affected;

  -- Phase 3: Clear all FK children of journal_entries before deleting them
  IF v_journal_ids IS NOT NULL AND array_length(v_journal_ids, 1) > 0 THEN
    v_phase := 'clear_journal_children';
    FOR r IN
      SELECT
        cl.relname AS child_table,
        att.attname AS fk_column,
        att.attnotnull AS is_not_null
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_class parent_cl ON parent_cl.oid = con.confrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE parent_cl.relname = 'journal_entries'
        AND ns.nspname = 'public'
        AND con.contype = 'f'
        AND cl.relname != 'journal_entry_lines' -- already handled
    LOOP
      BEGIN
        IF r.is_not_null THEN
          EXECUTE format('DELETE FROM public.%I WHERE %I = ANY($1)', r.child_table, r.fk_column)
          USING v_journal_ids;
        ELSE
          EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = ANY($1)', r.child_table, r.fk_column, r.fk_column)
          USING v_journal_ids;
        END IF;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        v_linked_cleared := v_linked_cleared + v_affected;
      EXCEPTION WHEN OTHERS THEN
        -- If UPDATE fails (e.g. trigger), try DELETE
        BEGIN
          EXECUTE format('DELETE FROM public.%I WHERE %I = ANY($1)', r.child_table, r.fk_column)
          USING v_journal_ids;
          GET DIAGNOSTICS v_affected = ROW_COUNT;
          v_linked_cleared := v_linked_cleared + v_affected;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to clear journal child: ' || r.child_table || '.' || r.fk_column,
            'detail', SQLERRM,
            'phase', v_phase
          );
        END;
      END;
    END LOOP;

    -- Now delete journal_entries
    v_phase := 'delete_journal_entries';
    DELETE FROM journal_entries WHERE company_id = p_company_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    v_linked_cleared := v_linked_cleared + v_affected;
  END IF;

  -- Phase 4: Clear all FK children of chart_of_accounts
  v_phase := 'clear_coa_children';
  
  -- Handle self-reference first (parent_account_id)
  UPDATE chart_of_accounts SET parent_account_id = NULL WHERE company_id = p_company_id AND parent_account_id IS NOT NULL;

  FOR r IN
    SELECT
      cl.relname AS child_table,
      att.attname AS fk_column,
      att.attnotnull AS is_not_null
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_class parent_cl ON parent_cl.oid = con.confrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE parent_cl.relname = 'chart_of_accounts'
      AND ns.nspname = 'public'
      AND con.contype = 'f'
      AND NOT (cl.relname = 'chart_of_accounts' AND att.attname = 'parent_account_id') -- already handled
      AND cl.relname != 'journal_entry_lines' -- already handled
  LOOP
    BEGIN
      IF r.is_not_null THEN
        EXECUTE format('DELETE FROM public.%I WHERE %I = ANY($1)', r.child_table, r.fk_column)
        USING v_account_ids;
      ELSE
        EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = ANY($1)', r.child_table, r.fk_column, r.fk_column)
        USING v_account_ids;
      END IF;
      GET DIAGNOSTICS v_affected = ROW_COUNT;
      v_linked_cleared := v_linked_cleared + v_affected;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE %I = ANY($1)', r.child_table, r.fk_column)
        USING v_account_ids;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
        v_linked_cleared := v_linked_cleared + v_affected;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Failed to clear COA child: ' || r.child_table || '.' || r.fk_column,
          'detail', SQLERRM,
          'phase', v_phase
        );
      END;
    END;
  END LOOP;

  -- Phase 5: Delete all COA accounts
  v_phase := 'delete_coa';
  DELETE FROM chart_of_accounts WHERE company_id = p_company_id;
  GET DIAGNOSTICS v_deleted_accounts = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_accounts', v_deleted_accounts,
    'deleted_linked', v_linked_cleared,
    'message', 'All accounts and linked data cleared successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'phase', v_phase
  );
END;
$function$;
