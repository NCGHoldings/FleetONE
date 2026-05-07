-- Migration: Fix misclassified direct payment GL entries
-- Description: More robust remediation for direct payments where GL Guardian forced it to Trade Payable.

DO $$
DECLARE
  payment_rec RECORD;
  correct_account_id UUID;
  target_jel_id UUID;
  updated_count INT := 0;
BEGIN
  -- We are looking for any ap_payment that IS a direct payment
  -- but its journal_entry_lines debited a liability account (like Trade Payable)
  -- instead of the account specified in ap_payment_lines.
  
  FOR payment_rec IN 
    SELECT 
      ap.id, 
      ap.payment_number, 
      ap.journal_entry_id,
      jel.id as jel_id,
      jel.account_id as current_account_id,
      coa.account_code,
      coa.account_name
    FROM ap_payments ap
    JOIN journal_entry_lines jel ON jel.journal_entry_id = ap.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE ap.is_direct_payment = true
      AND jel.debit > 0
      -- We specifically look for cases where the debit went to a liability account (like 22101001)
      -- or just ANY account that does NOT match the direct payment lines.
  LOOP
    -- Get the first line's account id from the direct payment lines
    SELECT apl.account_id INTO correct_account_id
    FROM ap_payment_lines apl
    WHERE apl.payment_id = payment_rec.id
      AND apl.line_total > 0
      AND apl.account_id IS NOT NULL
    LIMIT 1;

    -- If we have a correct account, and it's DIFFERENT from the current debit account
    IF correct_account_id IS NOT NULL AND correct_account_id != payment_rec.current_account_id THEN
      -- We have a mismatch! The GL Guardian (or a bug) posted this debit to the wrong account.
      
      RAISE NOTICE 'Fixing Payment %: Changing debit from % (%) to intended direct line account', 
        payment_rec.payment_number, payment_rec.account_code, payment_rec.account_name;
        
      UPDATE journal_entry_lines
      SET account_id = correct_account_id
      WHERE id = payment_rec.jel_id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Completed robust GL fix. Updated % journal entry lines.', updated_count;
END $$;
