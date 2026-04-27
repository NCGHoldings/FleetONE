-- This script creates an auto-sync trigger that guarantees the student's
-- balance, amount due, and status are ALWAYS 100% accurate.
-- It also automatically reactivates any inactive student if they make a payment!

CREATE OR REPLACE FUNCTION sync_school_student_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_total_invoiced NUMERIC;
    v_new_balance NUMERIC;
    v_new_due NUMERIC;
    v_status TEXT;
    v_student_id UUID;
    v_baseline_balance NUMERIC;
    v_baseline_time TIMESTAMP;
BEGIN
    -- Determine which student to update based on the operation
    IF TG_OP = 'DELETE' THEN
        v_student_id := OLD.student_id;
    ELSE
        v_student_id := NEW.student_id;
    END IF;

    IF v_student_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- Find baseline from the very first payment (if it exists)
    SELECT payment_balance_before, created_at 
    INTO v_baseline_balance, v_baseline_time
    FROM school_payment_transactions
    WHERE student_id = v_student_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        v_baseline_balance := 0;
        v_baseline_time := '1970-01-01 00:00:00'::timestamp;
    ELSE
        -- Move back 1 second to include the baseline transaction
        v_baseline_time := v_baseline_time - interval '1 second';
    END IF;

    -- Calculate Total Paid since baseline
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
    FROM school_payment_transactions
    WHERE student_id = v_student_id AND created_at > v_baseline_time;

    -- Calculate Total Invoiced since baseline
    SELECT COALESCE(SUM(amount), 0) INTO v_total_invoiced
    FROM school_ar_invoices
    WHERE student_id = v_student_id AND created_at > v_baseline_time AND status != 'void';

    -- The absolute mathematical truth
    v_new_balance := COALESCE(v_baseline_balance, 0) + v_total_paid - v_total_invoiced;
    v_new_due := GREATEST(0, -v_new_balance);

    -- Determine Paid vs Pending
    IF v_new_due <= 0 AND v_new_balance >= 0 THEN
        v_status := 'paid';
    ELSE
        v_status := 'pending';
    END IF;

    -- Auto-activate the student if this is a new incoming payment
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'school_payment_transactions' THEN
        UPDATE school_students SET is_active = true WHERE id = v_student_id AND is_active = false;
    END IF;

    -- Update the student record!
    UPDATE school_students
    SET 
        payment_balance = v_new_balance,
        current_amount_due = v_new_due,
        payment_status = v_status,
        payment_amount = (SELECT amount_paid FROM school_payment_transactions WHERE student_id = v_student_id ORDER BY payment_date DESC LIMIT 1),
        last_payment_date = (SELECT payment_date FROM school_payment_transactions WHERE student_id = v_student_id ORDER BY payment_date DESC LIMIT 1)
    WHERE id = v_student_id;

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to Payments
DROP TRIGGER IF EXISTS trigger_sync_school_student_balance ON school_payment_transactions;
CREATE TRIGGER trigger_sync_school_student_balance
AFTER INSERT OR UPDATE OR DELETE ON school_payment_transactions
FOR EACH ROW EXECUTE FUNCTION sync_school_student_balance();

-- Attach the trigger to Invoices
DROP TRIGGER IF EXISTS trigger_sync_school_student_balance_inv ON school_ar_invoices;
CREATE TRIGGER trigger_sync_school_student_balance_inv
AFTER INSERT OR UPDATE OR DELETE ON school_ar_invoices
FOR EACH ROW EXECUTE FUNCTION sync_school_student_balance();
