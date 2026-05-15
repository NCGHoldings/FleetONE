-- =============================================================================
-- FIX: Reclassify Input Tax from VAT RECEIVABLE → VAT CONTROL A/C
-- =============================================================================
-- 
-- PROBLEM: AP Invoice GL postings debited "Input Tax (VAT)" to the
--          VAT Receivable account (12602001) instead of the VAT Control
--          Account (22304000). This inflated VAT Receivable and left 
--          the VAT Control Account understated on the debit side.
--
-- SOLUTION: Loop through EACH journal entry that has lines in 12602001,
--           move them to 22304000 one-by-one with full audit logging.
--
-- APPROACH: Entry-by-entry (NOT bulk) — each JE is processed individually
--           with RAISE NOTICE so you can see exactly what moved.
--
-- SAFETY:
--   - Processes each journal entry individually with full logging
--   - No new JEs created — only re-points existing lines
--   - JE totals (total_debit/total_credit) stay unchanged
--   - Idempotent: running twice has no effect (lines already moved)
--   - Full audit trail via RAISE NOTICE for every single entry
-- =============================================================================

DO $$
DECLARE
  vat_receivable_id UUID;
  vat_control_id UUID;
  rec RECORD;
  line_rec RECORD;
  je_count INT := 0;
  line_count INT := 0;
  total_debit_moved NUMERIC(15,2) := 0;
  total_credit_moved NUMERIC(15,2) := 0;
  lines_in_je INT;
  vat_recv_new_balance NUMERIC(15,2);
  vat_ctrl_new_balance NUMERIC(15,2);
  settings_updated INT := 0;
BEGIN

  -- ═══════════════════════════════════════════════════════════════
  -- STEP 1: Resolve both account IDs
  -- ═══════════════════════════════════════════════════════════════

  SELECT id INTO vat_receivable_id
  FROM chart_of_accounts
  WHERE account_code = '12602001'
  LIMIT 1;

  SELECT id INTO vat_control_id
  FROM chart_of_accounts
  WHERE account_code = '22304000'
  LIMIT 1;

  IF vat_receivable_id IS NULL THEN
    RAISE EXCEPTION 'VAT Receivable account (12602001) not found in chart_of_accounts';
  END IF;

  IF vat_control_id IS NULL THEN
    RAISE EXCEPTION 'VAT Control account (22304000) not found in chart_of_accounts';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'VAT RECLASSIFICATION: 12602001 → 22304000';
  RAISE NOTICE '  VAT Receivable ID:  %', vat_receivable_id;
  RAISE NOTICE '  VAT Control ID:     %', vat_control_id;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════
  -- STEP 2: Process EACH journal entry that has VAT Receivable lines
  -- ═══════════════════════════════════════════════════════════════

  FOR rec IN
    SELECT DISTINCT
      je.id AS je_id,
      je.entry_number,
      je.entry_date,
      je.description AS je_description,
      je.reference,
      je.total_debit,
      je.status
    FROM journal_entries je
    INNER JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
    WHERE jel.account_id = vat_receivable_id
    ORDER BY je.entry_date ASC, je.entry_number ASC
  LOOP
    je_count := je_count + 1;
    lines_in_je := 0;

    RAISE NOTICE '──────────────────────────────────────────────────';
    RAISE NOTICE 'JE #%: % | % | % | Status: %', 
      je_count, rec.entry_number, rec.entry_date, rec.je_description, rec.status;

    -- Process each line in this JE that points to VAT Receivable
    FOR line_rec IN
      SELECT 
        jel.id AS line_id,
        jel.description AS line_desc,
        jel.debit,
        jel.credit
      FROM journal_entry_lines jel
      WHERE jel.journal_entry_id = rec.je_id
        AND jel.account_id = vat_receivable_id
      ORDER BY jel.created_at ASC
    LOOP
      -- Move this specific line to VAT Control
      UPDATE journal_entry_lines
      SET account_id = vat_control_id
      WHERE id = line_rec.line_id;

      lines_in_je := lines_in_je + 1;
      line_count := line_count + 1;
      total_debit_moved := total_debit_moved + COALESCE(line_rec.debit, 0);
      total_credit_moved := total_credit_moved + COALESCE(line_rec.credit, 0);

      RAISE NOTICE '  ✓ Line: % | DR: % | CR: % | Desc: %',
        line_rec.line_id, 
        COALESCE(line_rec.debit, 0), 
        COALESCE(line_rec.credit, 0),
        line_rec.line_desc;
    END LOOP;

    RAISE NOTICE '  → % line(s) moved for this JE', lines_in_je;
  END LOOP;

  IF je_count = 0 THEN
    RAISE NOTICE '✅ No journal entries found with VAT Receivable lines — already clean.';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE 'MOVEMENT COMPLETE: % JEs processed, % lines moved', je_count, line_count;
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════════
  -- STEP 3: Recalculate VAT Receivable balance (should become 0)
  -- ═══════════════════════════════════════════════════════════════

  -- VAT Receivable is an ASSET → balance = SUM(debit) - SUM(credit)
  SELECT COALESCE(SUM(debit) - SUM(credit), 0)
  INTO vat_recv_new_balance
  FROM journal_entry_lines
  WHERE account_id = vat_receivable_id;

  UPDATE chart_of_accounts
  SET current_balance = vat_recv_new_balance, updated_at = NOW()
  WHERE id = vat_receivable_id;

  RAISE NOTICE '✓ VAT Receivable (12602001) new balance: LKR %', vat_recv_new_balance;

  -- ═══════════════════════════════════════════════════════════════
  -- STEP 4: Recalculate VAT Control balance
  -- ═══════════════════════════════════════════════════════════════

  -- VAT Control is a LIABILITY → balance = SUM(credit) - SUM(debit)
  SELECT COALESCE(SUM(credit) - SUM(debit), 0)
  INTO vat_ctrl_new_balance
  FROM journal_entry_lines
  WHERE account_id = vat_control_id;

  UPDATE chart_of_accounts
  SET current_balance = vat_ctrl_new_balance, updated_at = NOW()
  WHERE id = vat_control_id;

  RAISE NOTICE '✓ VAT Control (22304000) new balance: LKR %', vat_ctrl_new_balance;

  -- ═══════════════════════════════════════════════════════════════
  -- STEP 5: Update gl_settings so future AP invoices post to 
  --         VAT Control instead of VAT Receivable
  -- ═══════════════════════════════════════════════════════════════

  UPDATE gl_settings
  SET input_tax_account_id = vat_control_id
  WHERE input_tax_account_id = vat_receivable_id;

  GET DIAGNOSTICS settings_updated = ROW_COUNT;
  RAISE NOTICE '✓ Updated % gl_settings row(s): input_tax_account_id → VAT Control (22304000)', settings_updated;

  -- ═══════════════════════════════════════════════════════════════
  -- FINAL SUMMARY
  -- ═══════════════════════════════════════════════════════════════

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  RECLASSIFICATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '  Journal Entries processed:  %', je_count;
  RAISE NOTICE '  Lines moved:                %', line_count;
  RAISE NOTICE '  Total Debits moved:         LKR %', total_debit_moved;
  RAISE NOTICE '  Total Credits moved:        LKR %', total_credit_moved;
  RAISE NOTICE '───────────────────────────────────────────────────────';
  RAISE NOTICE '  VAT Receivable (12602001):  LKR % (should be 0)', vat_recv_new_balance;
  RAISE NOTICE '  VAT Control (22304000):     LKR %', vat_ctrl_new_balance;
  RAISE NOTICE '  GL Settings updated:        %', settings_updated;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFY:';
  RAISE NOTICE '  SELECT account_code, account_name, current_balance';
  RAISE NOTICE '  FROM chart_of_accounts';
  RAISE NOTICE '  WHERE account_code IN (''12602001'', ''22304000'');';

END $$;
