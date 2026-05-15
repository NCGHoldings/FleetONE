-- =============================================================================
-- BACKFILL: Retroactive 18% VAT Split for ALL Business Units
-- =============================================================================
-- 
-- PURPOSE: Historical invoices were posted WITHOUT VAT separation because
-- vat_output_account_id was NULL in finance settings at the time of posting.
-- This migration retroactively splits the 18% inclusive VAT from existing
-- journal entries and credits it to the VAT Control Account (22304000).
--
-- MODULES COVERED:
--   1. SBS (School Bus)           → SBS-JE-*
--   2. SPH (Special Hire Invoice) → SPH-INV-*
--   3. YUT (Yutong)               → YUT-INV-*
--   4. SNT (Sinotruk)             → SNT-INV-*
--   5. LTV (Light Vehicle)        → LTV-INV-*
--   6. LEASE (Leasing)            → LEASE-GL-*
--
-- ⚠  SPH-ADJ EXCLUDED: The SPH-INV entry already includes the full amount
--    (original quotation + extra KM + additional expenses). Backfilling
--    SPH-ADJ would double-count the VAT on the adjustment portion.
--
-- LOGIC: For each qualifying JE:
--   1. Find the Revenue/Collection CREDIT line (the non-receivable line)
--   2. Calculate: vat = total - ROUND(total / 1.18, 2)
--   3. Reduce the Revenue credit by the VAT amount
--   4. Insert a new VAT Output credit line
--
-- SAFETY: 
--   - Only processes entries that do NOT already have a VAT Output line
--   - Idempotent: running twice will not double-apply
--   - Logs every change to RAISE NOTICE for audit trail
-- =============================================================================

DO $$
DECLARE
  vat_account_id UUID;
  rec RECORD;
  revenue_line RECORD;
  affected_account UUID;
  vat_amount NUMERIC(15,2);
  base_amount NUMERIC(15,2);
  total_amount NUMERIC(15,2);
  
  -- Per-module counters
  sbs_fixed INT := 0;
  sph_fixed INT := 0;
  yut_fixed INT := 0;
  snt_fixed INT := 0;
  ltv_fixed INT := 0;
  lease_fixed INT := 0;
  skipped INT := 0;
  ar_updated INT := 0;
  grand_total INT := 0;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 1: Resolve the VAT Control Account
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
    RAISE EXCEPTION 'Cannot find VAT Control Account. Please ensure account_code 22304000 exists in chart_of_accounts.';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'VAT BACKFILL: Using VAT Account ID = %', vat_account_id;
  RAISE NOTICE '⚠  SPH-ADJ EXCLUDED (already in SPH-INV total)';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 2: Process SCHOOL BUS Journal Entries (SBS-JE-*)
  -- ═══════════════════════════════════════════════════════════════════════════
  skipped := 0;
  RAISE NOTICE '';
  RAISE NOTICE '── [1/6] SCHOOL BUS OPERATIONS (SBS-JE-*) ──';

  FOR rec IN
    SELECT je.id AS je_id, je.entry_number, je.entry_date, je.total_debit,
           je.reference, je.description, je.company_id
    FROM journal_entries je
    WHERE je.entry_number LIKE 'SBS-JE-%'
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date ASC
  LOOP
    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    IF vat_amount < 0.01 THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    SELECT jel.id, jel.credit, jel.description
    INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id
      AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC
    LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  SKIP: % - No credit line found', rec.entry_number;
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    UPDATE journal_entry_lines
    SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)'
    WHERE id = revenue_line.id;

    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, description, debit, credit, company_id
    ) VALUES (
      rec.je_id, vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill]',
      0, vat_amount, rec.company_id
    );

    sbs_fixed := sbs_fixed + 1;
    RAISE NOTICE '  ✓ % | % | Total: % | Base: % | VAT: %',
      rec.entry_number, rec.entry_date, total_amount, base_amount, vat_amount;
  END LOOP;

  RAISE NOTICE 'SBS: % backfilled, % skipped', sbs_fixed, skipped;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 3: Process SPECIAL HIRE INVOICES ONLY (SPH-INV-*)
  -- ⚠  SPH-ADJ-* EXCLUDED — already included in SPH-INV total
  -- ═══════════════════════════════════════════════════════════════════════════
  skipped := 0;
  RAISE NOTICE '';
  RAISE NOTICE '── [2/6] SPECIAL HIRE INVOICES (SPH-INV-* only, NOT SPH-ADJ) ──';

  FOR rec IN
    SELECT je.id AS je_id, je.entry_number, je.entry_date, je.total_debit,
           je.reference, je.description, je.company_id
    FROM journal_entries je
    WHERE je.entry_number LIKE 'SPH-INV-%'
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date ASC
  LOOP
    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    IF vat_amount < 0.01 THEN skipped := skipped + 1; CONTINUE; END IF;

    SELECT jel.id, jel.credit, jel.description INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  SKIP: % - No credit line', rec.entry_number;
      skipped := skipped + 1; CONTINUE;
    END IF;

    UPDATE journal_entry_lines SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)' WHERE id = revenue_line.id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (rec.je_id, vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill]',
      0, vat_amount, rec.company_id);

    sph_fixed := sph_fixed + 1;
    RAISE NOTICE '  ✓ % | % | Total: % | Base: % | VAT: %',
      rec.entry_number, rec.entry_date, total_amount, base_amount, vat_amount;
  END LOOP;

  RAISE NOTICE 'SPH: % backfilled, % skipped', sph_fixed, skipped;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 4: Process YUTONG (YUT-INV-*)
  -- ═══════════════════════════════════════════════════════════════════════════
  skipped := 0;
  RAISE NOTICE '';
  RAISE NOTICE '── [3/6] YUTONG (YUT-INV-*) ──';

  FOR rec IN
    SELECT je.id AS je_id, je.entry_number, je.entry_date, je.total_debit,
           je.reference, je.description, je.company_id
    FROM journal_entries je
    WHERE je.entry_number LIKE 'YUT-INV-%'
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date ASC
  LOOP
    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    IF vat_amount < 0.01 THEN skipped := skipped + 1; CONTINUE; END IF;

    SELECT jel.id, jel.credit, jel.description INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  SKIP: % - No credit line', rec.entry_number;
      skipped := skipped + 1; CONTINUE;
    END IF;

    UPDATE journal_entry_lines SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)' WHERE id = revenue_line.id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (rec.je_id, vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill]',
      0, vat_amount, rec.company_id);

    yut_fixed := yut_fixed + 1;
    RAISE NOTICE '  ✓ % | % | Total: % | Base: % | VAT: %',
      rec.entry_number, rec.entry_date, total_amount, base_amount, vat_amount;
  END LOOP;

  RAISE NOTICE 'YUT: % backfilled, % skipped', yut_fixed, skipped;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 5: Process SINOTRUK (SNT-INV-*)
  -- ═══════════════════════════════════════════════════════════════════════════
  skipped := 0;
  RAISE NOTICE '';
  RAISE NOTICE '── [4/6] SINOTRUK (SNT-INV-*) ──';

  FOR rec IN
    SELECT je.id AS je_id, je.entry_number, je.entry_date, je.total_debit,
           je.reference, je.description, je.company_id
    FROM journal_entries je
    WHERE je.entry_number LIKE 'SNT-INV-%'
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date ASC
  LOOP
    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    IF vat_amount < 0.01 THEN skipped := skipped + 1; CONTINUE; END IF;

    SELECT jel.id, jel.credit, jel.description INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  SKIP: % - No credit line', rec.entry_number;
      skipped := skipped + 1; CONTINUE;
    END IF;

    UPDATE journal_entry_lines SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)' WHERE id = revenue_line.id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (rec.je_id, vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill]',
      0, vat_amount, rec.company_id);

    snt_fixed := snt_fixed + 1;
    RAISE NOTICE '  ✓ % | % | Total: % | Base: % | VAT: %',
      rec.entry_number, rec.entry_date, total_amount, base_amount, vat_amount;
  END LOOP;

  RAISE NOTICE 'SNT: % backfilled, % skipped', snt_fixed, skipped;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 6: Process LIGHT VEHICLE (LTV-INV-*)
  -- ═══════════════════════════════════════════════════════════════════════════
  skipped := 0;
  RAISE NOTICE '';
  RAISE NOTICE '── [5/6] LIGHT VEHICLE (LTV-INV-*) ──';

  FOR rec IN
    SELECT je.id AS je_id, je.entry_number, je.entry_date, je.total_debit,
           je.reference, je.description, je.company_id
    FROM journal_entries je
    WHERE je.entry_number LIKE 'LTV-INV-%'
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date ASC
  LOOP
    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    IF vat_amount < 0.01 THEN skipped := skipped + 1; CONTINUE; END IF;

    SELECT jel.id, jel.credit, jel.description INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  SKIP: % - No credit line', rec.entry_number;
      skipped := skipped + 1; CONTINUE;
    END IF;

    UPDATE journal_entry_lines SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)' WHERE id = revenue_line.id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (rec.je_id, vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill]',
      0, vat_amount, rec.company_id);

    ltv_fixed := ltv_fixed + 1;
    RAISE NOTICE '  ✓ % | % | Total: % | Base: % | VAT: %',
      rec.entry_number, rec.entry_date, total_amount, base_amount, vat_amount;
  END LOOP;

  RAISE NOTICE 'LTV: % backfilled, % skipped', ltv_fixed, skipped;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 7: Process LEASING (LEASE-GL-*)
  -- ═══════════════════════════════════════════════════════════════════════════
  skipped := 0;
  RAISE NOTICE '';
  RAISE NOTICE '── [6/6] LEASING (LEASE-GL-*) ──';

  FOR rec IN
    SELECT je.id AS je_id, je.entry_number, je.entry_date, je.total_debit,
           je.reference, je.description, je.company_id
    FROM journal_entries je
    WHERE je.entry_number LIKE 'LEASE-GL-%'
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines vel
        WHERE vel.journal_entry_id = je.id
          AND (vel.description ILIKE '%VAT%' OR vel.account_id = vat_account_id)
      )
      AND je.total_debit > 0
    ORDER BY je.entry_date ASC
  LOOP
    total_amount := rec.total_debit;
    base_amount := ROUND(total_amount / 1.18, 2);
    vat_amount := ROUND(total_amount - base_amount, 2);

    IF vat_amount < 0.01 THEN skipped := skipped + 1; CONTINUE; END IF;

    SELECT jel.id, jel.credit, jel.description INTO revenue_line
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = rec.je_id AND jel.credit > 0
      AND jel.description NOT ILIKE '%VAT%'
    ORDER BY jel.credit DESC LIMIT 1;

    IF revenue_line.id IS NULL THEN
      RAISE NOTICE '  SKIP: % - No credit line', rec.entry_number;
      skipped := skipped + 1; CONTINUE;
    END IF;

    UPDATE journal_entry_lines SET credit = credit - vat_amount,
        description = description || ' (Excl. VAT)' WHERE id = revenue_line.id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (rec.je_id, vat_account_id,
      'VAT Output (18% Inclusive) - ' || COALESCE(rec.reference, rec.entry_number) || ' [backfill]',
      0, vat_amount, rec.company_id);

    lease_fixed := lease_fixed + 1;
    RAISE NOTICE '  ✓ % | % | Total: % | Base: % | VAT: %',
      rec.entry_number, rec.entry_date, total_amount, base_amount, vat_amount;
  END LOOP;

  RAISE NOTICE 'LEASE: % backfilled, % skipped', lease_fixed, skipped;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 8: Recalculate COA Balances for ALL affected accounts
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '── UPDATING COA BALANCES ──';

  -- VAT Control Account
  UPDATE chart_of_accounts
  SET current_balance = COALESCE((
    SELECT SUM(COALESCE(credit, 0) - COALESCE(debit, 0))
    FROM journal_entry_lines WHERE account_id = vat_account_id
  ), 0), updated_at = NOW()
  WHERE id = vat_account_id;
  RAISE NOTICE '  ✓ VAT Control Account balance recalculated';

  -- All Revenue/Collection accounts that were modified
  FOR affected_account IN
    SELECT DISTINCT jel.account_id
    FROM journal_entry_lines jel
    WHERE jel.description LIKE '%(Excl. VAT)%'
      AND jel.account_id IS NOT NULL
  LOOP
    UPDATE chart_of_accounts
    SET current_balance = COALESCE((
      SELECT SUM(COALESCE(credit, 0) - COALESCE(debit, 0))
      FROM journal_entry_lines WHERE account_id = affected_account
    ), 0), updated_at = NOW()
    WHERE id = affected_account;
    RAISE NOTICE '  ✓ Revenue account % recalculated', affected_account;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 9: Update AR Invoice tax metadata
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '── UPDATING AR INVOICE TAX METADATA ──';

  UPDATE ar_invoices ari
  SET 
    tax_amount = ROUND(ari.total_amount - ROUND(ari.total_amount / 1.18, 2), 2),
    subtotal = ROUND(ari.total_amount / 1.18, 2)
  WHERE ari.journal_entry_id IS NOT NULL
    AND ari.total_amount > 0
    AND (ari.tax_amount IS NULL OR ari.tax_amount = 0)
    AND EXISTS (
      SELECT 1 FROM journal_entry_lines jel
      WHERE jel.journal_entry_id = ari.journal_entry_id
        AND jel.description LIKE '%[backfill]%'
    );

  GET DIAGNOSTICS ar_updated = ROW_COUNT;
  RAISE NOTICE '  ✓ % AR invoices updated with tax metadata', ar_updated;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 10: Propagate VAT Account to ALL finance settings
  -- ═══════════════════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '── PROPAGATING VAT ACCOUNT TO ALL SETTINGS ──';

  -- School Bus
  UPDATE school_bus_finance_settings
  SET vat_output_account_id = vat_account_id
  WHERE vat_output_account_id IS NULL;
  GET DIAGNOSTICS ar_updated = ROW_COUNT;
  RAISE NOTICE '  ✓ % SBS settings updated', ar_updated;

  -- Special Hire
  UPDATE special_hire_finance_settings
  SET vat_output_account_id = vat_account_id
  WHERE vat_output_account_id IS NULL;
  GET DIAGNOSTICS ar_updated = ROW_COUNT;
  RAISE NOTICE '  ✓ % SPH settings updated', ar_updated;

  -- Yutong
  BEGIN
    UPDATE yutong_finance_settings
    SET vat_output_account_id = vat_account_id
    WHERE vat_output_account_id IS NULL;
    GET DIAGNOSTICS ar_updated = ROW_COUNT;
    RAISE NOTICE '  ✓ % YUT settings updated', ar_updated;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '  ⏭ yutong_finance_settings table not found, skipping';
  END;

  -- Sinotruk
  BEGIN
    UPDATE sinotruck_finance_settings
    SET vat_output_account_id = vat_account_id
    WHERE vat_output_account_id IS NULL;
    GET DIAGNOSTICS ar_updated = ROW_COUNT;
    RAISE NOTICE '  ✓ % SNT settings updated', ar_updated;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '  ⏭ sinotruck_finance_settings table not found, skipping';
  END;

  -- Light Vehicle
  BEGIN
    UPDATE lightvehicle_finance_settings
    SET vat_output_account_id = vat_account_id
    WHERE vat_output_account_id IS NULL;
    GET DIAGNOSTICS ar_updated = ROW_COUNT;
    RAISE NOTICE '  ✓ % LTV settings updated', ar_updated;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '  ⏭ lightvehicle_finance_settings table not found, skipping';
  END;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- FINAL SUMMARY
  -- ═══════════════════════════════════════════════════════════════════════════
  grand_total := sbs_fixed + sph_fixed + yut_fixed + snt_fixed + ltv_fixed + lease_fixed;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'BACKFILL COMPLETE — ALL MODULES';
  RAISE NOTICE '───────────────────────────────────────────────────────';
  RAISE NOTICE '  School Bus (SBS):     %', sbs_fixed;
  RAISE NOTICE '  Special Hire (SPH):   %', sph_fixed;
  RAISE NOTICE '  Yutong (YUT):         %', yut_fixed;
  RAISE NOTICE '  Sinotruk (SNT):       %', snt_fixed;
  RAISE NOTICE '  Light Vehicle (LTV):  %', ltv_fixed;
  RAISE NOTICE '  Leasing (LEASE):      %', lease_fixed;
  RAISE NOTICE '───────────────────────────────────────────────────────';
  RAISE NOTICE '  GRAND TOTAL:          %', grand_total;
  RAISE NOTICE '  SPH-ADJ skipped:      (by design — already in SPH-INV)';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFY: SELECT description, credit FROM journal_entry_lines';
  RAISE NOTICE '  WHERE description ILIKE ''%%[backfill]%%'' ORDER BY created_at DESC;';
END $$;
