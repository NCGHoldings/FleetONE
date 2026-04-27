-- This script safely removes exact duplicate bank imports for SBO students 
-- and recalculates their correct payment_status, balance, and amount_due.

DO $$
DECLARE
    r RECORD;
    dup_cursor CURSOR FOR
        SELECT 
            student_id, 
            payment_date, 
            amount_paid, 
            (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
            array_agg(id) as all_ids
        FROM school_payment_transactions
        WHERE reference_no LIKE 'IMPORT-%'
        GROUP BY student_id, payment_date, amount_paid
        HAVING COUNT(*) > 1;

    student_record RECORD;
    v_baseline_balance NUMERIC;
    v_baseline_time TIMESTAMP;
    v_total_paid NUMERIC;
    v_total_invoiced NUMERIC;
    v_new_balance NUMERIC;
    v_new_due NUMERIC;
    v_status TEXT;
    v_fixed_count INT := 0;
    v_deleted_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting SBO payment duplicate cleanup...';

    -- 1. Identify and delete exact duplicates
    FOR r IN dup_cursor LOOP
        RAISE NOTICE 'Found duplicate payments for student % on date %. Keeping ID: %', r.student_id, r.payment_date, r.keep_id;
        
        -- Unlink ar_invoices that were tied to the duplicate transactions
        UPDATE school_ar_invoices 
        SET payment_id = NULL, paid_amount = 0, status = 'posted'
        WHERE payment_id = ANY(r.all_ids) AND payment_id != r.keep_id;

        -- Delete all IDs EXCEPT the one we are keeping
        DELETE FROM school_payment_transactions 
        WHERE id = ANY(r.all_ids) AND id != r.keep_id;

        v_deleted_count := v_deleted_count + (array_length(r.all_ids, 1) - 1);
    END LOOP;

    RAISE NOTICE 'Deleted % duplicate transactions.', v_deleted_count;

    -- 2. Recalculate true balances for ALL students
    FOR student_record IN 
        SELECT id FROM school_students WHERE is_active = true
    LOOP
        -- Find baseline from the very first payment (if it exists)
        SELECT payment_balance_before, created_at 
        INTO v_baseline_balance, v_baseline_time
        FROM school_payment_transactions
        WHERE student_id = student_record.id
        ORDER BY created_at ASC
        LIMIT 1;

        IF NOT FOUND THEN
            v_baseline_balance := 0;
            v_baseline_time := '1970-01-01 00:00:00'::timestamp;
        ELSE
            -- Move baseline time back 1 second to ensure we include the first payment
            v_baseline_time := v_baseline_time - interval '1 second';
        END IF;

        -- Sum all valid activity AFTER the baseline
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
        FROM school_payment_transactions
        WHERE student_id = student_record.id AND created_at > v_baseline_time;

        SELECT COALESCE(SUM(amount), 0) INTO v_total_invoiced
        FROM school_ar_invoices
        WHERE student_id = student_record.id AND created_at > v_baseline_time AND status != 'void';

        v_new_balance := COALESCE(v_baseline_balance, 0) + v_total_paid - v_total_invoiced;
        v_new_due := GREATEST(0, -v_new_balance);

        -- Determine status based on strict rules
        IF v_new_due <= 0 AND v_new_balance >= 0 THEN
            v_status := 'paid';
        ELSE
            v_status := 'pending';
        END IF;

        -- Update the student record
        UPDATE school_students
        SET 
            payment_balance = v_new_balance,
            current_amount_due = v_new_due,
            payment_status = v_status,
            payment_amount = (SELECT amount_paid FROM school_payment_transactions WHERE student_id = student_record.id ORDER BY payment_date DESC LIMIT 1),
            last_payment_date = (SELECT payment_date FROM school_payment_transactions WHERE student_id = student_record.id ORDER BY payment_date DESC LIMIT 1)
        WHERE id = student_record.id
        AND (
            COALESCE(payment_balance, 0) != v_new_balance 
            OR COALESCE(current_amount_due, 0) != v_new_due 
            OR COALESCE(payment_status, '') != v_status
        );

        IF FOUND THEN
            v_fixed_count := v_fixed_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Successfully resynced balances for % students.', v_fixed_count;
END $$;
