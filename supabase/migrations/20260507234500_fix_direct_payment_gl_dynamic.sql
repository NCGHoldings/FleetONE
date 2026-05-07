-- Migration: Dynamic Fix for Direct Payment GL Mismatches
-- Description: Corrects any direct payment where the posted debit account does not match the chosen line item account.

DO $$
DECLARE
  payment_rec RECORD;
  correct_account_id UUID;
  updated_count INT := 0;
BEGIN
  FOR payment_rec IN 
    SELECT 
      ap.id, 
      ap.payment_number, 
      jel.id as jel_id,
      jel.account_id as current_account_id,
      coa.account_code,
      coa.account_name
    FROM ap_payments ap
    JOIN journal_entry_lines jel ON jel.journal_entry_id = ap.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE ap.is_direct_payment = true
      AND jel.debit > 0
  LOOP
    -- Fetch the correct intended account from the payment lines
    SELECT apl.account_id INTO correct_account_id
    FROM ap_payment_lines apl
    WHERE apl.payment_id = payment_rec.id
      AND apl.line_total > 0
      AND apl.account_id IS NOT NULL
    LIMIT 1;

    -- If the account doesn't match, the GL Guardian has overridden it due to a silent failure
    IF correct_account_id IS NOT NULL AND correct_account_id != payment_rec.current_account_id THEN
      RAISE NOTICE 'Fixing Payment %: Changing debit from % (%) to intended direct line account', 
        payment_rec.payment_number, payment_rec.account_code, payment_rec.account_name;
        
      UPDATE journal_entry_lines
      SET account_id = correct_account_id
      WHERE id = payment_rec.jel_id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Completed dynamic GL fix. Updated % journal entry lines.', updated_count;
END $$;
