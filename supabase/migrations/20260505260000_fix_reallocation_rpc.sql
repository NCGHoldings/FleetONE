CREATE OR REPLACE FUNCTION reallocate_school_payment_advance(
    p_payment_id uuid,
    p_target_student_id uuid,
    p_amount numeric,
    p_user_id uuid
) RETURNS json AS $$
DECLARE
    v_source_payment school_payment_transactions;
    v_source_student school_students;
    v_target_student school_students;
    v_settings school_bus_finance_settings;
    v_je_id uuid;
    v_je_num text;
    v_ar_account uuid;
    v_rand_suffix text;
    v_target_new_payment_id uuid;
    v_remaining_amount numeric;
    v_inv RECORD;
    v_outstanding numeric;
    v_applied numeric;
BEGIN
    -- 1. Fetch Source Data and Lock
    SELECT * INTO v_source_payment FROM school_payment_transactions WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Source payment not found'; 
    END IF;

    IF p_amount <= 0 THEN 
        RAISE EXCEPTION 'Reallocation amount must be greater than zero'; 
    END IF;

    -- Note: We allow reallocating up to the total amount paid on that receipt.
    IF p_amount > v_source_payment.amount_paid THEN
        RAISE EXCEPTION 'Cannot reallocate more than the original payment amount (LKR %)', v_source_payment.amount_paid;
    END IF;

    SELECT * INTO v_source_student FROM school_students WHERE id = v_source_payment.student_id;
    SELECT * INTO v_target_student FROM school_students WHERE id = p_target_student_id;

    IF v_target_student IS NULL THEN
        RAISE EXCEPTION 'Target student not found';
    END IF;

    IF v_source_student.branch_id != v_target_student.branch_id THEN
        RAISE EXCEPTION 'Target student must be in the same branch to maintain GL integrity';
    END IF;

    -- 2. Fetch Finance Settings (Without company_id on student)
    SELECT * INTO v_settings 
    FROM school_bus_finance_settings 
    WHERE (branch_id = v_source_student.branch_id OR branch_id IS NULL)
    ORDER BY branch_id NULLS LAST 
    LIMIT 1;

    IF v_settings IS NULL THEN
        RAISE EXCEPTION 'Finance settings not found for this branch.';
    END IF;

    v_ar_account := v_settings.trade_receivable_account_id;
    IF v_ar_account IS NULL THEN
        RAISE EXCEPTION 'AR Account not configured for this branch. Cannot process GL transfer.';
    END IF;

    -- 3. Create GL Journal Entry for Transfer
    v_rand_suffix := upper(substring(md5(random()::text) from 1 for 6));
    v_je_num := 'SBS-XFR-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || v_rand_suffix;

    INSERT INTO journal_entries (
        entry_number, entry_date, description, reference,
        total_debit, total_credit, status, company_id,
        business_unit_code, business_unit_id, posted_at, created_by
    ) VALUES (
        v_je_num, CURRENT_DATE, 'Advance Reallocation: ' || v_source_student.student_name || ' -> ' || v_target_student.student_name,
        'PAY-' || substring(p_payment_id::text from 1 for 8), p_amount, p_amount, 'posted', v_settings.company_id,
        'SBO', v_source_student.branch_id, now(), p_user_id
    ) RETURNING id INTO v_je_id;

    -- JE Line 1: Debit Source Student AR (Reduces their Advance Credit liability)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (v_je_id, v_ar_account, 'XFR Out - ' || v_source_student.student_name, p_amount, 0, v_settings.company_id);

    -- JE Line 2: Credit Target Student AR (Increases their Advance Credit liability or pays off their invoice)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
    VALUES (v_je_id, v_ar_account, 'XFR In - ' || v_target_student.student_name, 0, p_amount, v_settings.company_id);

    -- Update COA Balances (Since Net is 0 on the exact same account, current_balance remains identical, but we do it for completeness)
    UPDATE chart_of_accounts SET current_balance = current_balance + p_amount, updated_at = now() WHERE id = v_ar_account;
    UPDATE chart_of_accounts SET current_balance = current_balance - p_amount, updated_at = now() WHERE id = v_ar_account;

    -- 4. Create Negative Payment for Source
    INSERT INTO school_payment_transactions (
        student_id, payment_month, fixed_amount, amount_paid, difference, 
        payment_balance_before, payment_balance_after, payment_method, 
        reference_no, notes, created_by, journal_entry_id, gl_posted, payment_date
    ) VALUES (
        v_source_student.id, v_source_payment.payment_month, 0, -p_amount, -p_amount,
        v_source_student.payment_balance, v_source_student.payment_balance - p_amount, 'Transfer Out',
        'XFR-TO-' || substring(v_target_student.id::text from 1 for 8), 
        'Reallocated to ' || v_target_student.student_name, 
        p_user_id, v_je_id, true, CURRENT_DATE
    );

    -- 5. Create Positive Payment for Target
    INSERT INTO school_payment_transactions (
        student_id, payment_month, fixed_amount, amount_paid, difference, 
        payment_balance_before, payment_balance_after, payment_method, 
        reference_no, notes, created_by, journal_entry_id, gl_posted, payment_date
    ) VALUES (
        v_target_student.id, v_source_payment.payment_month, 0, p_amount, p_amount,
        v_target_student.payment_balance, v_target_student.payment_balance + p_amount, 'Transfer In',
        'XFR-FROM-' || substring(v_source_student.id::text from 1 for 8), 
        'Reallocated from ' || v_source_student.student_name, 
        p_user_id, v_je_id, true, CURRENT_DATE
    ) RETURNING id INTO v_target_new_payment_id;

    -- 6. Auto-Allocate Target Student Invoices (FIFO)
    v_remaining_amount := p_amount;
    FOR v_inv IN 
        SELECT id, invoice_amount, paid_amount 
        FROM school_ar_invoices 
        WHERE student_id = p_target_student_id 
          AND status IN ('pending', 'partial')
        ORDER BY created_at ASC
    LOOP
        IF v_remaining_amount <= 0 THEN
            EXIT;
        END IF;

        v_outstanding := v_inv.invoice_amount - COALESCE(v_inv.paid_amount, 0);
        
        IF v_outstanding > 0 THEN
            v_applied := LEAST(v_remaining_amount, v_outstanding);
            
            UPDATE school_ar_invoices
            SET paid_amount = COALESCE(paid_amount, 0) + v_applied,
                status = CASE WHEN (COALESCE(paid_amount, 0) + v_applied) >= invoice_amount THEN 'paid' ELSE 'partial' END,
                payment_id = v_target_new_payment_id,
                updated_at = now()
            WHERE id = v_inv.id;

            v_remaining_amount := v_remaining_amount - v_applied;
        END IF;
    END LOOP;

    -- 7. Trigger syncs will automatically update school_students.payment_balance for both

    RETURN json_build_object(
        'success', true, 
        'je_id', v_je_id,
        'message', 'Successfully reallocated LKR ' || p_amount || ' to ' || v_target_student.student_name
    );
END;
$$ LANGUAGE plpgsql;
