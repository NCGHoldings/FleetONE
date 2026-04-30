-- REVERSE SCRIPT: Hide dummy/test students
-- This will safely deactivate all the thousands of extra students that flooded your branches.
-- It only deactivates students who have absolutely zero payment history and zero invoices.

DO $$
DECLARE
    v_deactivated_count INT := 0;
BEGIN
    RAISE NOTICE 'Reversing activation of dummy/inactive students...';
    
    -- Deactivate students who have NO payment history AND NO invoices
    -- This safely targets the thousands of test/imported students that were previously hidden
    UPDATE school_students
    SET is_active = false
    WHERE id NOT IN (SELECT DISTINCT student_id FROM school_payment_transactions WHERE student_id IS NOT NULL)
      AND id NOT IN (SELECT DISTINCT student_id FROM school_ar_invoices WHERE student_id IS NOT NULL);
      
    GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
    RAISE NOTICE 'Successfully deactivated % dummy students.', v_deactivated_count;
END $$;
