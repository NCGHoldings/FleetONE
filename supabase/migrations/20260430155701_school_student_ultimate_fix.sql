-- The Ultimate School Operations Healing Script
-- This script will:
-- 1. Ensure all students in Wattala (and globally) are properly activated so they show up.
-- 2. Synchronize any AR invoices paid in the Finance module back to School Operations.
-- 3. Completely recalculate every single student's balance, amount due, and status based on mathematical truth.

DO $$
DECLARE
    student_record RECORD;
    v_baseline_balance NUMERIC;
    v_baseline_time TIMESTAMP;
    v_total_paid NUMERIC;
    v_total_invoiced NUMERIC;
    v_new_balance NUMERIC;
    v_new_due NUMERIC;
    v_status TEXT;
    v_fixed_count INT := 0;
BEGIN
    RAISE NOTICE '1. Activating all students...';
    -- Many imported students often default to inactive or NULL. This reactivates them so they appear in the Payment module.
    UPDATE school_students SET is_active = true WHERE is_active IS FALSE OR is_active IS NULL;

    RAISE NOTICE '2. Syncing Finance AR Invoices to School AR Invoices...';
    -- Sync AR Invoices paid directly from the central Finance module back to School Operations
    UPDATE school_ar_invoices sai
    SET 
        paid_amount = ai.paid_amount,
        status = ai.status
    FROM ar_invoices ai
    WHERE sai.ar_invoice_id = ai.id
      AND (sai.paid_amount IS DISTINCT FROM ai.paid_amount OR sai.status IS DISTINCT FROM ai.status);

    RAISE NOTICE '3. Recalculating all student balances...';
    -- Loop through all active students to recalculate their true financial position
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
            -- Move baseline time back 1 second to ensure we include the first payment in the sum
            v_baseline_time := v_baseline_time - interval '1 second';
        END IF;

        -- Sum all valid payments AFTER the baseline
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
        FROM school_payment_transactions
        WHERE student_id = student_record.id AND created_at > v_baseline_time;

        -- Sum all invoices AFTER the baseline
        SELECT COALESCE(SUM(amount), 0) INTO v_total_invoiced
        FROM school_ar_invoices
        WHERE student_id = student_record.id AND created_at > v_baseline_time AND status != 'void';

        -- The absolute mathematical truth
        v_new_balance := COALESCE(v_baseline_balance, 0) + v_total_paid - v_total_invoiced;
        v_new_due := GREATEST(0, -v_new_balance);

        -- Determine status based on strict mathematical rules
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
            payment_amount = COALESCE((SELECT amount_paid FROM school_payment_transactions WHERE student_id = student_record.id ORDER BY payment_date DESC LIMIT 1), payment_amount),
            last_payment_date = COALESCE((SELECT payment_date FROM school_payment_transactions WHERE student_id = student_record.id ORDER BY payment_date DESC LIMIT 1), last_payment_date)
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
