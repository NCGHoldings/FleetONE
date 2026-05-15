-- =============================================================================
-- VAT BACKFILL TEST: Process EXACTLY 1 Invoice Per Module (SAFE ROLLBACK)
-- =============================================================================
-- 
-- Tests VAT split logic on a SINGLE invoice from each module.
-- Shows BEFORE and AFTER states. Auto-ROLLBACK — no data changed.
--
-- Modules covered:
--   1. SBS (School Bus)           → SBS-JE-*
--   2. SPH (Special Hire Invoice) → SPH-INV-*   (NOT SPH-ADJ — already in SPH-INV total)
--   3. YUT (Yutong)               → YUT-INV-*
--   4. SNT (Sinotruk)             → SNT-INV-*
--   5. LTV (Light Vehicle)        → LTV-INV-*
--   6. LEASE (Leasing)            → LEASE-GL-*
--
-- ⚠  SPH-ADJ EXCLUDED: The SPH-INV entry already includes the adjustment
--    amount (original + extra KM + expenses). Backfilling SPH-ADJ would
--    double-count the VAT on the adjustment portion.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  vat_account_id UUID;
  rec RECORD;
  revenue_line RECORD;
  vat_amount NUMERIC(15,2);
  base_amount NUMERIC(15,2);
  total_amount NUMERIC(15,2);
  processed INT := 0;
  
  -- Module prefixes to test (one entry per module)
  module_prefix TEXT;
  module_name TEXT;
  module_prefixes TEXT[] := ARRAY[
    'SBS-JE-',
    'SPH-INV-',
    'YUT-INV-',
    'SNT-INV-',
    'LTV-INV-',
    'LEASE-GL-'
  ];
  module_names TEXT[] := ARRAY[
    'School Bus',
    'Special Hire Invoice',
    'Yutong',
    'Sinotruk',
    'Light Vehicle',
    'Leasing'
  ];
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 1: Resolve VAT Control Account
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO vat_account_id
  FROM chart_of_accounts
  WHERE account_code = '22304000'
  LIMIT 1;

  IF vat_account_id IS NULL THEN
    SELECT id INTO vat_account_id
    FROM chart_of_accounts
    WHERE account_name ILIKE '%VAT%CONTROL%'
       OR account_name ILIKE '%VAT%Output%'
    LIMIT 1;
  END IF;

  IF vat_account_id IS NULL THEN
    SELECT vat_output_account_id INTO vat_account_id
    FROM special_hire_finance_settings
    WHERE vat_output_account_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF vat_account_id IS NULL THEN
    SELECT vat_output_account_id INTO vat_account_id
    FROM school_bus_finance_settings
    WHERE vat_output_account_id IS NOT NULL
    LIMIT 1;
  END IF;

  IF vat_account_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find VAT Control Account (22304000). Cannot proceed.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '  VAT BACKFILL TEST — ONE INVOICE PER MODULE';
  RAISE NOTICE '  VAT Account: %', vat_account_id;
  RAISE NOTICE '  ⚠  SPH-ADJ EXCLUDED (already in SPH-INV total)';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 2: Process ONE invoice from each module
  -- ═══════════════════════════════════════════════════════════════════════════
  FOR i IN 1..array_length(module_prefixes, 1) LOOP
    module_prefix := module_prefixes[i];
    module_name := module_names[i];

    RAISE NOTICE '';
    RAISE NOTICE '── [%/6] Module: % (prefix: %) ──', i, module_name, module_prefix;

    -- Find ONE qualifying JE for this module
    SELECT 
      je.id AS je_id,
      je.entry_number,
      je.entry_date,
      je.total_debit,
      je.reference,
      je.description,
      je.company_id
    INTO rec
    FROM journal_entries je
    WHERE je.entry_number LIKE module_prefix || '%'
      -- Skip entries that already have a VAT line
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date DESC  -- Take the MOST RECENT one
    LIMIT 1;

    IF rec.je_id IS NULL THEN
      RAISE NOTICE '  ⏭  No qualifying entries found (all already have VAT or none exist)';
      CONTINUE;
    END IF;

    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    RAISE NOTICE '  FOUND: %', rec.entry_number;
    RAISE NOTICE '  Date:  %', rec.entry_date;
    RAISE NOTICE '  Ref:   %', rec.reference;
    RAISE NOTICE '  Desc:  %', rec.description;

    -- Show BEFORE state — all lines of this JE
    RAISE NOTICE '';
    RAISE NOTICE '  ┌─── BEFORE (Current JE Lines) ───';
    FOR revenue_line IN
      SELECT jel.description AS line_desc, jel.debit, jel.credit
      FROM journal_entry_lines jel
      WHERE jel.journal_entry_id = rec.je_id
      ORDER BY jel.debit DESC, jel.credit DESC
    LOOP
      RAISE NOTICE '  │ DR: %  CR: %  — %', 
        LPAD(revenue_line.debit::TEXT, 12), 
        LPAD(revenue_line.credit::TEXT, 12), 
        revenue_line.line_desc;
    END LOOP;
    RAISE NOTICE '  └────────────────────────────────';

    -- Skip trivially small amounts
    IF vat_amount < 0.01 THEN
      RAISE NOTICE '  ⏭  VAT amount too small (%.2f), skipping', vat_amount;
      CONTINUE;
    END IF;

    -- Find the Revenue/Collection CREDIT line to reduce
    SELECT jel.id, jel.credit, jel.description AS line_desc
    INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id
      AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC
    LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  ⚠  No credit line found to split — SKIPPING';
      CONTINUE;
    END IF;

    -- APPLY: Reduce the revenue credit by VAT amount
    UPDATE journal_entry_lines
    SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)'
    WHERE id = revenue_line.id;

    -- APPLY: Insert new VAT Output credit line
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, description, debit, credit, company_id
    ) VALUES (
      rec.je_id,
      vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill-test]',
      0,
      vat_amount,
      rec.company_id
    );

    -- Show AFTER state
    RAISE NOTICE '';
    RAISE NOTICE '  ┌─── AFTER (Updated JE Lines) ───';
    FOR revenue_line IN
      SELECT jel.description AS line_desc, jel.debit, jel.credit
      FROM journal_entry_lines jel
      WHERE jel.journal_entry_id = rec.je_id
      ORDER BY jel.debit DESC, jel.credit DESC
    LOOP
      RAISE NOTICE '  │ DR: %  CR: %  — %', 
        LPAD(revenue_line.debit::TEXT, 12), 
        LPAD(revenue_line.credit::TEXT, 12), 
        revenue_line.line_desc;
    END LOOP;
    RAISE NOTICE '  └────────────────────────────────';

    -- Verification: Check DR = CR balance
    RAISE NOTICE '';
    RAISE NOTICE '  📊 CALCULATION:';
    RAISE NOTICE '     Total (Inclusive):  %', total_amount;
    RAISE NOTICE '     Base (Excl. VAT):  %', base_amount;
    RAISE NOTICE '     VAT (18%%):         %', vat_amount;
    RAISE NOTICE '     VAT %% Check:       %', ROUND(vat_amount / base_amount * 100, 2);
    RAISE NOTICE '     DR=CR Balance:      %', 
      CASE WHEN total_amount = base_amount + vat_amount THEN '✅ BALANCED' ELSE '❌ IMBALANCED' END;

    processed := processed + 1;
    RAISE NOTICE '  ✅ Module % test complete!', module_name;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- SUMMARY
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '  TEST SUMMARY: % modules processed', processed;
  RAISE NOTICE '';
  RAISE NOTICE '  ⚠  This is running inside a TRANSACTION.';
  RAISE NOTICE '  ⚠  All changes will be ROLLED BACK unless you change';
  RAISE NOTICE '     the last line from ROLLBACK to COMMIT.';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAFETY: ROLLBACK by default — change to COMMIT to apply
-- ═══════════════════════════════════════════════════════════════════════════
ROLLBACK;
-- To apply the test changes permanently, replace ROLLBACK above with:
-- COMMIT;
