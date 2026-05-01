-- Fix script for missing bank transactions
DO $$ 
DECLARE
  rec RECORD;
  v_bank_account_id UUID;
  inserted_count INT := 0;
BEGIN
  -- Find AR Receipts from School Bus that don't have a bank_transaction
  FOR rec IN 
    SELECT ar.id, ar.receipt_number, ar.receipt_date, ar.amount, ar.customer_id, ar.reference, ar.company_id, ar.journal_entry_id, ar.bank_account_id, c.customer_name
    FROM ar_receipts ar
    LEFT JOIN customers c ON c.id = ar.customer_id
    LEFT JOIN bank_transactions bt ON bt.source_id = ar.id AND bt.source_type = 'ar_receipt'
    WHERE ar.receipt_number LIKE 'SBS-REC-%'
      AND bt.id IS NULL
  LOOP
    -- Determine the bank account
    v_bank_account_id := rec.bank_account_id;
    
    -- If bank_account_id is null on the receipt, try to derive it from the journal entry
    IF v_bank_account_id IS NULL AND rec.journal_entry_id IS NOT NULL THEN
      SELECT ba.id INTO v_bank_account_id
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON coa.id = jel.account_id
      JOIN bank_accounts ba ON ba.gl_account_id = coa.id
      WHERE jel.journal_entry_id = rec.journal_entry_id
        AND jel.debit > 0
        AND coa.account_type IN ('asset', 'bank', 'cash')
      LIMIT 1;
    END IF;
    
    -- Insert bank transaction if we found the bank account
    IF v_bank_account_id IS NOT NULL THEN
      INSERT INTO bank_transactions (
        bank_account_id,
        transaction_date,
        transaction_type,
        description,
        debit_amount,
        credit_amount,
        reference,
        company_id,
        source_type,
        source_id,
        is_reconciled
      ) VALUES (
        v_bank_account_id,
        rec.receipt_date,
        'receipt',
        'School Bus Payment from ' || COALESCE(rec.customer_name, 'Student') || ' - ' || rec.receipt_number,
        rec.amount,
        0,
        rec.reference,
        rec.company_id,
        'ar_receipt',
        rec.id,
        false
      );
      
      -- Update AR receipt with the bank account ID if it was missing
      IF rec.bank_account_id IS NULL THEN
        UPDATE ar_receipts SET bank_account_id = v_bank_account_id WHERE id = rec.id;
      END IF;
      
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Inserted % missing bank transactions', inserted_count;
END $$;

-- Also fix Grouped Payments that were missed
DO $$ 
DECLARE
  rec RECORD;
  v_bank_account_id UUID;
  inserted_count INT := 0;
BEGIN
  -- Find Journal Entries for Grouped School Bus Payments that don't have a bank_transaction
  FOR rec IN 
    SELECT je.id, je.entry_number, je.entry_date, je.description, je.reference, je.total_debit, je.company_id
    FROM journal_entries je
    LEFT JOIN bank_transactions bt ON bt.source_id = je.id AND bt.source_type = 'journal_entry'
    WHERE je.description LIKE 'Grouped School Bus Payment%'
      AND bt.id IS NULL
  LOOP
    -- Derive bank account from journal entry lines
    SELECT ba.id INTO v_bank_account_id
    FROM journal_entry_lines jel
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    JOIN bank_accounts ba ON ba.gl_account_id = coa.id
    WHERE jel.journal_entry_id = rec.id
      AND jel.debit > 0
      AND coa.account_type IN ('asset', 'bank', 'cash')
    LIMIT 1;
    
    IF v_bank_account_id IS NOT NULL THEN
      INSERT INTO bank_transactions (
        bank_account_id,
        transaction_date,
        transaction_type,
        description,
        debit_amount,
        credit_amount,
        reference,
        company_id,
        source_type,
        source_id,
        is_reconciled
      ) VALUES (
        v_bank_account_id,
        rec.entry_date,
        'receipt',
        rec.description,
        rec.total_debit,
        0,
        rec.reference,
        rec.company_id,
        'journal_entry',
        rec.id,
        false
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Inserted % missing GROUPED bank transactions', inserted_count;
END $$;
