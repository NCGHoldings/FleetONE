-- Migration: 20260505180000_school_payment_reversal_rpc.sql
-- Description: Adds ACID-compliant RPCs for safely deleting and reversing School Bus Payments

-- 1. Function to get the breakdown of the impact of deleting a school bus payment
CREATE OR REPLACE FUNCTION get_school_payment_deletion_breakdown(p_payment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment record;
    v_ar_receipt record;
    v_je_count int := 0;
    v_je_numbers text[] := ARRAY[]::text[];
    v_bank_tx_count int := 0;
    v_bank_balance_restored numeric := 0;
    v_student_balance_restored numeric := 0;
    v_result json;
    v_payment_ar_receipt_id uuid;
    v_ar_receipt_id uuid;
    v_ar_receipt_je_id uuid;
    v_ar_receipt_number text := NULL;
    v_payment_je_id uuid;
    v_je_ids uuid[] := ARRAY[]::uuid[];
BEGIN
    -- Get the payment record
    SELECT * INTO v_payment FROM school_payment_transactions WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'School payment transaction not found';
    END IF;

    -- Calculate how much the payment impacted the student's balance
    v_student_balance_restored := v_payment.payment_balance_after - v_payment.payment_balance_before;
    v_payment_ar_receipt_id := v_payment.ar_receipt_id;
    v_payment_je_id := v_payment.journal_entry_id;

    IF v_payment_je_id IS NOT NULL THEN
        v_je_ids := array_append(v_je_ids, v_payment_je_id);
    END IF;

    -- Check for linked AR receipt
    IF v_payment_ar_receipt_id IS NOT NULL THEN
        SELECT * INTO v_ar_receipt FROM ar_receipts WHERE id = v_payment_ar_receipt_id;
        
        IF FOUND THEN
            v_ar_receipt_id := v_ar_receipt.id;
            v_ar_receipt_je_id := v_ar_receipt.journal_entry_id;
            v_ar_receipt_number := v_ar_receipt.receipt_number;

            IF v_ar_receipt_je_id IS NOT NULL AND NOT (v_je_ids @> ARRAY[v_ar_receipt_je_id]) THEN
                v_je_ids := array_append(v_je_ids, v_ar_receipt_je_id);
            END IF;

            -- Check Bank Transactions linked to AR receipt
            SELECT count(*), COALESCE(sum(debit_amount - credit_amount), 0)
            INTO v_bank_tx_count, v_bank_balance_restored
            FROM bank_transactions
            WHERE source_type = 'ar_receipt' AND source_id = v_ar_receipt_id;
        END IF;
    END IF;

    -- Fetch all JEs
    IF array_length(v_je_ids, 1) > 0 THEN
        SELECT count(*), array_agg(entry_number) INTO v_je_count, v_je_numbers
        FROM journal_entries 
        WHERE id = ANY(v_je_ids);
    END IF;

    v_result := json_build_object(
        'payment_amount', v_payment.amount_paid,
        'student_balance_impact', v_student_balance_restored,
        'has_ar_receipt', (v_payment_ar_receipt_id IS NOT NULL),
        'ar_receipt_number', v_ar_receipt_number,
        'je_count', v_je_count,
        'je_numbers', v_je_numbers,
        'bank_tx_count', v_bank_tx_count,
        'bank_balance_restored', v_bank_balance_restored
    );

    RETURN v_result;
END;
$$;


-- 2. Function to safely delete the school payment and all related records
CREATE OR REPLACE FUNCTION delete_and_reverse_school_payment(p_payment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment record;
    v_ar_receipt record;
    v_student record;
    v_balance_impact numeric;
    v_new_balance numeric;
    v_new_amount_due numeric;
    v_je_id uuid;
    v_student_id uuid;
    v_payment_ar_receipt_id uuid;
    v_ar_receipt_id uuid;
    v_payment_je_id uuid;
BEGIN
    -- Start by locking the payment record to prevent race conditions
    SELECT * INTO v_payment FROM school_payment_transactions WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'School payment transaction not found';
    END IF;

    -- 1. Revert Student Balance
    v_balance_impact := v_payment.payment_balance_after - v_payment.payment_balance_before;
    v_student_id := v_payment.student_id;
    v_payment_je_id := v_payment.journal_entry_id;
    
    SELECT * INTO v_student FROM school_students WHERE id = v_student_id FOR UPDATE;
    IF FOUND THEN
        v_new_balance := COALESCE(v_student.payment_balance, 0) - v_balance_impact;
        v_new_amount_due := GREATEST(0, -v_new_balance);

        UPDATE school_students
        SET payment_balance = v_new_balance,
            current_amount_due = v_new_amount_due
        WHERE id = v_student_id;
    END IF;

    -- 2. Delete linked AR Receipt and related records
    v_payment_ar_receipt_id := v_payment.ar_receipt_id;
    IF v_payment_ar_receipt_id IS NOT NULL THEN
        SELECT * INTO v_ar_receipt FROM ar_receipts WHERE id = v_payment_ar_receipt_id FOR UPDATE;
        
        IF FOUND THEN
            v_je_id := v_ar_receipt.journal_entry_id;
            v_ar_receipt_id := v_ar_receipt.id;

            -- A. Un-link the AR receipt from the payment to avoid foreign key violations
            UPDATE school_payment_transactions SET ar_receipt_id = NULL WHERE id = p_payment_id;

            -- B. Delete Bank Transactions (this triggers bank_accounts balance update via existing triggers)
            DELETE FROM bank_transactions WHERE source_type = 'ar_receipt' AND source_id = v_ar_receipt_id;

            -- C. Delete AR Receipt
            DELETE FROM ar_receipts WHERE id = v_ar_receipt_id;

            -- D. Safely unlink from IOU testing before deleting Journal Entry to prevent FK violations
            IF v_je_id IS NOT NULL THEN
                UPDATE iou_records SET journal_entry_id = NULL WHERE journal_entry_id = v_je_id;
                DELETE FROM journal_entries WHERE id = v_je_id;
            END IF;
        END IF;
    END IF;

    -- Delete payment's own Journal Entry if it exists and is different from AR receipt JE
    IF v_payment_je_id IS NOT NULL THEN
        IF v_je_id IS NULL OR v_payment_je_id != v_je_id THEN
            UPDATE iou_records SET journal_entry_id = NULL WHERE journal_entry_id = v_payment_je_id;
            DELETE FROM journal_entries WHERE id = v_payment_je_id;
        END IF;
    END IF;

    -- 3. Delete the Payment Transaction
    DELETE FROM school_payment_transactions WHERE id = p_payment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'School payment and all related financial records deleted successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically in PL/pgSQL on exception
        RAISE EXCEPTION 'Failed to delete school payment: %', SQLERRM;
END;
$$;
