-- ==========================================================
-- FIX MISTAKEN REVERSALS
-- Run STEP 1 first to see the list, then use STEP 2 per entry
-- ==========================================================


-- STEP 1: See all reversed pairs in April (run this first to pick which ones to fix)
SELECT 
  orig.entry_number AS original_entry,
  orig.entry_date,
  orig.description,
  orig.total_debit,
  orig.total_credit,
  orig.source_module,
  rev.entry_number AS reversal_entry,
  rev.id AS reversal_id,
  orig.id AS original_id
FROM journal_entries orig
JOIN journal_entries rev ON (
  rev.reversed_entry_id = orig.id 
  OR orig.reversed_entry_id = rev.id
)
WHERE orig.status = 'reversed'
  AND (rev.is_reversal = true OR rev.entry_number ILIKE 'REV-%')
  AND rev.id != orig.id
  AND orig.entry_date >= '2026-04-01'
  AND orig.entry_date <= '2026-04-30'
ORDER BY orig.entry_date DESC;


-- ==========================================================
-- STEP 2: UNDO A SPECIFIC REVERSAL
-- ⚠️ Replace the IDs below with values from STEP 1 results
-- Run ONE entry at a time!
-- ==========================================================

-- 👇 PASTE THE IDs FROM STEP 1 HERE:
-- DO SET original_id = '<paste original_id here>';
-- DO SET reversal_id = '<paste reversal_id here>';

-- Example (replace with real IDs):
-- Original: JE-DP-PAY-2026-20281
-- Reversal: REV-JE-DP-PAY-2026-20281-EDIT

DO $$
DECLARE
  v_original_id UUID := '<PASTE_ORIGINAL_ID_HERE>';   -- ← Replace this
  v_reversal_id UUID := '<PASTE_REVERSAL_ID_HERE>';   -- ← Replace this
  v_line RECORD;
  v_account RECORD;
  v_net_amount NUMERIC;
  v_adjustment NUMERIC;
  v_is_debit_normal BOOLEAN;
BEGIN
  -- SAFETY CHECK: Verify the pair exists and is valid
  IF NOT EXISTS (
    SELECT 1 FROM journal_entries WHERE id = v_original_id AND status = 'reversed'
  ) THEN
    RAISE EXCEPTION 'Original entry % not found or not in reversed status', v_original_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM journal_entries WHERE id = v_reversal_id 
      AND (is_reversal = true OR entry_number ILIKE 'REV-%')
  ) THEN
    RAISE EXCEPTION 'Reversal entry % not found or not a reversal', v_reversal_id;
  END IF;

  RAISE NOTICE '--- Starting undo for original: % ---', v_original_id;

  -- 1. Re-apply the original COA balance impacts
  --    (The reversal UNDID them, so we need to put them back)
  FOR v_line IN 
    SELECT jel.account_id, jel.debit, jel.credit
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = v_original_id
  LOOP
    SELECT current_balance, account_type INTO v_account
    FROM chart_of_accounts WHERE id = v_line.account_id;

    IF v_account IS NOT NULL THEN
      v_net_amount := COALESCE(v_line.debit, 0) - COALESCE(v_line.credit, 0);
      v_is_debit_normal := v_account.account_type IN ('asset', 'expense');
      
      IF v_is_debit_normal THEN
        v_adjustment := v_net_amount;
      ELSE
        v_adjustment := -v_net_amount;
      END IF;

      UPDATE chart_of_accounts
      SET current_balance = COALESCE(current_balance, 0) + v_adjustment
      WHERE id = v_line.account_id;

      RAISE NOTICE 'Restored balance for account %: adjustment = %', v_line.account_id, v_adjustment;
    END IF;
  END LOOP;

  -- 2. Delete the reversal entry lines
  DELETE FROM journal_entry_lines WHERE journal_entry_id = v_reversal_id;
  RAISE NOTICE 'Deleted reversal entry lines for %', v_reversal_id;

  -- 3. Delete the reversal entry itself
  DELETE FROM journal_entries WHERE id = v_reversal_id;
  RAISE NOTICE 'Deleted reversal entry %', v_reversal_id;

  -- 4. Restore original entry to posted status and clear the reversal link
  UPDATE journal_entries
  SET status = 'posted',
      reversed_entry_id = NULL
  WHERE id = v_original_id;
  RAISE NOTICE 'Restored original entry % to posted status', v_original_id;

  RAISE NOTICE '✅ UNDO COMPLETE for original: %', v_original_id;
END $$;


-- STEP 3: VERIFY the fix worked (run after each undo)
-- Replace the ID below with the original_id you just fixed
SELECT 
  entry_number, entry_date, description, status, 
  total_debit, total_credit, is_reversal, reversed_entry_id
FROM journal_entries 
WHERE id = '<PASTE_ORIGINAL_ID_HERE>'
   OR reversed_entry_id = '<PASTE_ORIGINAL_ID_HERE>';
