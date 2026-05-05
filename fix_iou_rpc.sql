-- RPC to get breakdown of items that will be deleted/reversed when deleting an IOU
CREATE OR REPLACE FUNCTION public.get_iou_deletion_breakdown(p_iou_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_iou_number TEXT;
    v_amount NUMERIC;
    v_status TEXT;
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
    SELECT iou_number, amount, status 
    INTO v_iou_number, v_amount, v_status 
    FROM public.iou_records WHERE id = p_iou_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "IOU not found"}'::JSONB;
    END IF;

    -- 2. Find related Journal Entries by reference
    SELECT 
        COUNT(*), 
        ARRAY_AGG(entry_number) 
    INTO v_je_count, v_je_numbers
    FROM public.journal_entries 
    WHERE reference = v_iou_number OR reference = 'IOU-' || substr(p_iou_id::text, 1, 8);

    -- 3. Find related Petty Cash Transactions
    SELECT 
        COUNT(*), 
        ARRAY_AGG(DISTINCT pcf.fund_name),
        SUM(CASE WHEN pct.transaction_type = 'disbursement' THEN pct.amount ELSE -pct.amount END)
    INTO v_pc_count, v_pc_funds, v_pc_impact
    FROM public.petty_cash_transactions pct
    LEFT JOIN public.petty_cash_funds pcf ON pcf.id = pct.petty_cash_fund_id
    WHERE pct.reference_number = v_iou_number;

    -- 4. Find related AP Payments / Bank Transactions
    SELECT 
        COUNT(*),
        SUM(credit_amount)
    INTO v_bank_tx_count, v_bank_impact
    FROM public.bank_transactions
    WHERE description ILIKE '%' || v_iou_number || '%';

    -- Build the result
    v_result = jsonb_build_object(
        'iou_number', v_iou_number,
        'amount', v_amount,
        'status', v_status,
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
    v_iou_number TEXT;
    v_pct_id UUID;
    v_pct_type TEXT;
    v_pct_amount NUMERIC;
    v_pct_fund_id UUID;
BEGIN
    -- 1. Lock the IOU
    SELECT iou_number INTO v_iou_number FROM public.iou_records WHERE id = p_iou_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'IOU not found';
    END IF;

    -- 2. Delete Journal Entries
    DELETE FROM public.journal_entries 
    WHERE reference = v_iou_number OR reference = 'IOU-' || substr(p_iou_id::text, 1, 8);

    -- 3. Reverse Petty Cash Transactions and Restore Fund Balances
    FOR v_pct_id, v_pct_type, v_pct_amount, v_pct_fund_id IN 
        SELECT id, transaction_type, amount, petty_cash_fund_id 
        FROM public.petty_cash_transactions 
        WHERE reference_number = v_iou_number
    LOOP
        UPDATE public.petty_cash_funds
        SET current_balance = current_balance + 
            CASE WHEN v_pct_type = 'disbursement' THEN v_pct_amount ELSE -v_pct_amount END,
            updated_at = NOW()
        WHERE id = v_pct_fund_id;
        
        DELETE FROM public.petty_cash_transactions WHERE id = v_pct_id;
    END LOOP;

    -- 4. Reverse Bank Transactions / AP Payments
    DELETE FROM public.bank_transactions
    WHERE description ILIKE '%' || v_iou_number || '%';

    DELETE FROM public.ap_payments
    WHERE notes ILIKE '%' || v_iou_number || '%';

    -- 5. Delete the IOU record itself
    DELETE FROM public.iou_records WHERE id = p_iou_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete and reverse IOU: %', SQLERRM;
END;
$$;
