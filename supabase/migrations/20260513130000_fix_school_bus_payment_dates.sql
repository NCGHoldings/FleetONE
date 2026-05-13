-- ============================================================================
-- Fix School Bus Student payment dates that were incorrectly recorded as 2026-05-01
-- Correct dates from user's operational records:
--   3,900.00 (ref '099') → 2026-04-02
--   9,700.00 (ref '099') → 2026-04-07
--   2,000.00 (ref 'bus') → 2026-04-07
--   9,000.00 (ref '099') → 2026-04-16
-- Sampath Bank C/A — 000311003310
-- ============================================================================

DO $$
DECLARE
  v_bank_account_id UUID;
  v_count INT := 0;
BEGIN
  -- Resolve the bank account ID from the account number shown on screen
  SELECT id INTO v_bank_account_id
  FROM bank_accounts
  WHERE account_number = '000311003310'
  LIMIT 1;

  IF v_bank_account_id IS NULL THEN
    RAISE NOTICE 'Bank account 000311003310 not found — trying by name pattern';
    SELECT id INTO v_bank_account_id
    FROM bank_accounts
    WHERE account_name ILIKE '%SAMPATH%' AND account_number ILIKE '%3310%'
    LIMIT 1;
  END IF;

  IF v_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Sampath Bank C/A 000311003310 — aborting';
  END IF;

  RAISE NOTICE 'Found bank account: %', v_bank_account_id;

  -- 1. LKR 3,900.00 → 2026-04-02 (ref '099')
  UPDATE bank_transactions
  SET transaction_date = '2026-04-02'
  WHERE bank_account_id = v_bank_account_id
    AND transaction_date = '2026-05-01'
    AND debit_amount = 3900
    AND description ILIKE '%School Bus%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated 3,900 → Apr 02: % rows', v_count;

  -- 2. LKR 9,700.00 → 2026-04-07 (ref '099')
  UPDATE bank_transactions
  SET transaction_date = '2026-04-07'
  WHERE bank_account_id = v_bank_account_id
    AND transaction_date = '2026-05-01'
    AND debit_amount = 9700
    AND description ILIKE '%School Bus%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated 9,700 → Apr 07: % rows', v_count;

  -- 3. LKR 2,000.00 → 2026-04-07 (ref 'bus')
  UPDATE bank_transactions
  SET transaction_date = '2026-04-07'
  WHERE bank_account_id = v_bank_account_id
    AND transaction_date = '2026-05-01'
    AND debit_amount = 2000
    AND description ILIKE '%School Bus%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated 2,000 → Apr 07: % rows', v_count;

  -- 4. LKR 9,000.00 → 2026-04-16 (ref '099')
  UPDATE bank_transactions
  SET transaction_date = '2026-04-16'
  WHERE bank_account_id = v_bank_account_id
    AND transaction_date = '2026-05-01'
    AND debit_amount = 9000
    AND description ILIKE '%School Bus%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated 9,000 → Apr 16: % rows', v_count;

  -- Also fix the corresponding school_payment_transactions if they have the wrong date
  -- Match by amount and approximate date
  UPDATE school_payment_transactions
  SET payment_date = '2026-04-02'
  WHERE payment_date = '2026-05-01'
    AND amount_paid = 3900
    AND reference_no = '099';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'Fixed school_payment 3,900 → Apr 02: % rows', v_count; END IF;

  UPDATE school_payment_transactions
  SET payment_date = '2026-04-07'
  WHERE payment_date = '2026-05-01'
    AND amount_paid = 9700
    AND reference_no = '099';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'Fixed school_payment 9,700 → Apr 07: % rows', v_count; END IF;

  UPDATE school_payment_transactions
  SET payment_date = '2026-04-07'
  WHERE payment_date = '2026-05-01'
    AND amount_paid = 2000
    AND reference_no = 'bus';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'Fixed school_payment 2,000 → Apr 07: % rows', v_count; END IF;

  UPDATE school_payment_transactions
  SET payment_date = '2026-04-16'
  WHERE payment_date = '2026-05-01'
    AND amount_paid = 9000
    AND reference_no = '099';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN RAISE NOTICE 'Fixed school_payment 9,000 → Apr 16: % rows', v_count; END IF;

  -- Also fix linked journal entries if any
  UPDATE journal_entries je
  SET entry_date = bt.transaction_date
  FROM bank_transactions bt
  WHERE bt.bank_account_id = v_bank_account_id
    AND bt.description ILIKE '%School Bus%'
    AND bt.transaction_date IN ('2026-04-02', '2026-04-07', '2026-04-16')
    AND bt.debit_amount IN (3900, 9700, 2000, 9000)
    AND je.reference = bt.reference
    AND je.entry_date = '2026-05-01';

  RAISE NOTICE 'Date correction migration complete.';
END $$;
