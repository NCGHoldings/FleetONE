-- RPC to get breakdown of items that will be deleted/reversed when deleting an IOU
CREATE OR REPLACE FUNCTION public.get_iou_deletion_breakdown(p_iou_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_iou_record RECORD;
    v_je_count INT;
    v_je_numbers TEXT[];
    v_pc_count INT;
    v_pc_funds TEXT[];
    v_pc_impact NUMERIC;
    v_bank_tx_count INT;
    v_bank_impact NUMERIC;
    v_result JSONB;
BEGIN
    -- 1. Get the IOU
    SELECT * INTO v_iou_record FROM public.iou_records WHERE id = p_iou_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "IOU not found"}'::JSONB;
    END IF;

    -- 2. Find related Journal Entries by reference
    SELECT 
        COUNT(*), 
        ARRAY_AGG(entry_number) 
    INTO v_je_count, v_je_numbers
    FROM public.journal_entries 
    WHERE reference = v_iou_record.iou_number OR reference = 'IOU-' || substr(v_iou_record.id::text, 1, 8);

    -- 3. Find related Petty Cash Transactions
    SELECT 
        COUNT(*), 
        ARRAY_AGG(DISTINCT pcf.fund_name),
        SUM(CASE WHEN pct.transaction_type = 'disbursement' THEN pct.amount ELSE -pct.amount END)
    INTO v_pc_count, v_pc_funds, v_pc_impact
    FROM public.petty_cash_transactions pct
    LEFT JOIN public.petty_cash_funds pcf ON pcf.id = pct.petty_cash_fund_id
    WHERE pct.reference_number = v_iou_record.iou_number;

    -- 4. Find related AP Payments / Bank Transactions
    SELECT 
        COUNT(*),
        SUM(credit_amount)
    INTO v_bank_tx_count, v_bank_impact
    FROM public.bank_transactions
    WHERE description ILIKE '%' || v_iou_record.iou_number || '%';

    -- Build the result
    v_result = jsonb_build_object(
        'iou_number', v_iou_record.iou_number,
        'amount', v_iou_record.amount,
        'status', v_iou_record.status,
        'je_count', COALESCE(v_je_count, 0),
        'je_numbers', COALESCE(v_je_numbers, ARRAY[]::TEXT[]),
        'pc_count', COALESCE(v_pc_count, 0),
        'pc_funds', COALESCE(v_pc_funds, ARRAY[]::TEXT[]),
        'pc_balance_restored', COALESCE(v_pc_impact, 0),
        'bank_tx_count', COALESCE(v_bank_tx_count, 0),
        'bank_balance_restored', COALESCE(v_bank_impact, 0)
    );

    RETURN v_result;
END;
$$;

-- RPC to perform the actual deletion and reversal
CREATE OR REPLACE FUNCTION public.delete_and_reverse_iou(p_iou_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_iou_record RECORD;
    v_pct RECORD;
BEGIN
    -- 1. Lock the IOU
    SELECT * INTO v_iou_record FROM public.iou_records WHERE id = p_iou_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'IOU not found';
    END IF;

    -- 2. Delete Journal Entries
    -- Due to ON DELETE CASCADE on journal_entry_lines, deleting the parent JE deletes the lines.
    -- Triggers on journal_entry_lines will automatically update the chart_of_accounts balances!
    DELETE FROM public.journal_entries 
    WHERE reference = v_iou_record.iou_number OR reference = 'IOU-' || substr(v_iou_record.id::text, 1, 8);

    -- 3. Reverse Petty Cash Transactions and Restore Fund Balances
    FOR v_pct IN 
        SELECT * FROM public.petty_cash_transactions 
        WHERE reference_number = v_iou_record.iou_number
    LOOP
        -- If it was a disbursement (money went out), we need to add it back to the fund.
        -- If it was a replenishment (money came in from settlement), we need to deduct it.
        UPDATE public.petty_cash_funds
        SET current_balance = current_balance + 
            CASE WHEN v_pct.transaction_type = 'disbursement' THEN v_pct.amount ELSE -v_pct.amount END,
            updated_at = NOW()
        WHERE id = v_pct.petty_cash_fund_id;
        
        -- Delete the transaction
        DELETE FROM public.petty_cash_transactions WHERE id = v_pct.id;
    END LOOP;

    -- 4. Reverse Bank Transactions / AP Payments (if it was from Bank)
    -- This relies on the maintain_bank_balance trigger to update the bank account balance automatically
    DELETE FROM public.bank_transactions
    WHERE description ILIKE '%' || v_iou_record.iou_number || '%';

    DELETE FROM public.ap_payments
    WHERE notes ILIKE '%' || v_iou_record.iou_number || '%';

    -- 5. Delete the IOU record itself
    DELETE FROM public.iou_records WHERE id = p_iou_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete and reverse IOU: %', SQLERRM;
END;
$$;
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
BEGIN
    -- Get the payment record
    SELECT * INTO v_payment FROM school_payment_transactions WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'School payment transaction not found';
    END IF;

    -- Calculate how much the payment impacted the student's balance
    v_student_balance_restored := v_payment.payment_balance_after - v_payment.payment_balance_before;

    -- Check for linked AR receipt
    IF v_payment.ar_receipt_id IS NOT NULL THEN
        SELECT * INTO v_ar_receipt FROM ar_receipts WHERE id = v_payment.ar_receipt_id;
        
        IF FOUND THEN
            -- Check Journal Entries linked to AR receipt
            IF v_ar_receipt.journal_entry_id IS NOT NULL THEN
                SELECT count(*), array_agg(entry_number) INTO v_je_count, v_je_numbers
                FROM journal_entries 
                WHERE id = v_ar_receipt.journal_entry_id;
            END IF;

            -- Check Bank Transactions linked to AR receipt
            SELECT count(*), COALESCE(sum(debit_amount - credit_amount), 0)
            INTO v_bank_tx_count, v_bank_balance_restored
            FROM bank_transactions
            WHERE source_type = 'ar_receipt' AND source_id = v_ar_receipt.id;
        END IF;
    END IF;

    v_result := json_build_object(
        'payment_amount', v_payment.amount_paid,
        'student_balance_impact', v_student_balance_restored,
        'has_ar_receipt', (v_payment.ar_receipt_id IS NOT NULL),
        'ar_receipt_number', v_ar_receipt.receipt_number,
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
BEGIN
    -- Start by locking the payment record to prevent race conditions
    SELECT * INTO v_payment FROM school_payment_transactions WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'School payment transaction not found';
    END IF;

    -- 1. Revert Student Balance
    v_balance_impact := v_payment.payment_balance_after - v_payment.payment_balance_before;
    
    SELECT * INTO v_student FROM school_students WHERE id = v_payment.student_id FOR UPDATE;
    IF FOUND THEN
        v_new_balance := COALESCE(v_student.payment_balance, 0) - v_balance_impact;
        v_new_amount_due := GREATEST(0, -v_new_balance);

        UPDATE school_students
        SET payment_balance = v_new_balance,
            current_amount_due = v_new_amount_due
        WHERE id = v_student.id;
    END IF;

    -- 2. Delete linked AR Receipt and related records
    IF v_payment.ar_receipt_id IS NOT NULL THEN
        SELECT * INTO v_ar_receipt FROM ar_receipts WHERE id = v_payment.ar_receipt_id FOR UPDATE;
        
        IF FOUND THEN
            v_je_id := v_ar_receipt.journal_entry_id;

            -- A. Un-link the AR receipt from the payment to avoid foreign key violations
            UPDATE school_payment_transactions SET ar_receipt_id = NULL WHERE id = p_payment_id;

            -- B. Delete Bank Transactions (this triggers bank_accounts balance update via existing triggers)
            DELETE FROM bank_transactions WHERE source_type = 'ar_receipt' AND source_id = v_ar_receipt.id;

            -- C. Delete AR Receipt
            DELETE FROM ar_receipts WHERE id = v_ar_receipt.id;

            -- D. Delete Journal Entry (lines will cascade or be deleted via trigger)
            IF v_je_id IS NOT NULL THEN
                DELETE FROM journal_entries WHERE id = v_je_id;
            END IF;
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
