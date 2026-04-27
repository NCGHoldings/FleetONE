-- This script finds all school payments that were GL posted but missing bank transactions
-- and retroactively creates the bank transactions and updates bank account balances.

DO $$
DECLARE
    r RECORD;
    v_bank_account_id UUID;
BEGIN
    FOR r IN
        SELECT 
            pt.id AS payment_id,
            s.branch_id,
            ar.company_id,
            pt.amount_paid AS amount,
            pt.payment_date,
            s.student_name,
            pt.reference_no,
            pt.ar_receipt_id,
            ar.receipt_number
        FROM school_payment_transactions pt
        JOIN school_students s ON pt.student_id = s.id
        JOIN ar_receipts ar ON pt.ar_receipt_id = ar.id
        WHERE pt.gl_posted = true
          AND ar.bank_account_id IS NULL
          AND pt.payment_date >= date_trunc('month', current_date) -- This month
    LOOP
        -- Find the bank account ID for this branch from school_bus_finance_settings
        SELECT bank_account_id INTO v_bank_account_id
        FROM school_bus_finance_settings
        WHERE branch_id = r.branch_id
          AND bank_account_id IS NOT NULL
        LIMIT 1;
        
        -- Fallback to default company settings if branch has none
        IF v_bank_account_id IS NULL THEN
            SELECT bank_account_id INTO v_bank_account_id
            FROM school_bus_finance_settings
            WHERE company_id = r.company_id
              AND branch_id IS NULL
              AND bank_account_id IS NOT NULL
            LIMIT 1;
        END IF;

        IF v_bank_account_id IS NOT NULL THEN
            -- Check if bank transaction already exists for this ar_receipt
            IF NOT EXISTS (
                SELECT 1 FROM bank_transactions 
                WHERE source_type = 'ar_receipt' AND source_id = r.ar_receipt_id
            ) THEN
                -- Insert bank transaction
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
                    source_id
                ) VALUES (
                    v_bank_account_id,
                    r.payment_date,
                    'receipt',
                    'School Bus Payment from ' || r.student_name || ' - ' || COALESCE(r.receipt_number, ''),
                    r.amount,
                    0,
                    COALESCE(r.reference_no, r.payment_id::text),
                    r.company_id,
                    'ar_receipt',
                    r.ar_receipt_id
                );

                -- Update ar_receipt
                UPDATE ar_receipts 
                SET bank_account_id = v_bank_account_id
                WHERE id = r.ar_receipt_id;

                -- Update bank account balance
                UPDATE bank_accounts
                SET current_balance = COALESCE(current_balance, 0) + r.amount
                WHERE id = v_bank_account_id;
                
                RAISE NOTICE 'Fixed payment % for student %', r.payment_id, r.student_name;
            END IF;
        END IF;
    END LOOP;
END $$;
