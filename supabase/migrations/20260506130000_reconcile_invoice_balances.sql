-- Reconciliation script to fix desynced invoice balances
-- This script audits all ap_invoices and ar_invoices and ensures their 
-- paid_amount and balance fields match the sum of their allocations.

CREATE OR REPLACE FUNCTION reconcile_all_invoice_balances()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ap_count INT := 0;
    v_ar_count INT := 0;
    v_rec RECORD;
    v_total_allocated NUMERIC;
    v_new_status TEXT;
    v_results JSONB;
BEGIN
    RAISE NOTICE 'Starting AP Invoice reconciliation...';
    
    -- 1. Reconcile AP Invoices
    FOR v_rec IN 
        SELECT id, total_amount, paid_amount, balance, status 
        FROM ap_invoices 
        WHERE status != 'void'
    LOOP
        -- Calculate sum of all allocations for this invoice
        SELECT COALESCE(SUM(allocated_amount + COALESCE(wht_deducted, 0) + COALESCE(write_off_amount, 0)), 0)
        INTO v_total_allocated
        FROM ap_payment_allocations
        WHERE invoice_id = v_rec.id;
        
        -- Check if there is a desync
        IF v_rec.paid_amount != v_total_allocated OR v_rec.balance != (v_rec.total_amount - v_total_allocated) THEN
            
            -- Determine new status
            IF v_total_allocated >= v_rec.total_amount THEN
                v_new_status := 'paid';
            ELSIF v_total_allocated > 0 THEN
                v_new_status := 'partial';
            ELSE
                v_new_status := 'unpaid';
            END IF;
            
            UPDATE ap_invoices
            SET 
                paid_amount = v_total_allocated,
                balance = v_rec.total_amount - v_total_allocated,
                status = v_new_status,
                updated_at = now()
            WHERE id = v_rec.id;
            
            v_ap_count := v_ap_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Starting AR Invoice reconciliation...';
    
    -- 2. Reconcile AR Invoices
    FOR v_rec IN 
        SELECT id, total_amount, paid_amount, balance, status 
        FROM ar_invoices 
        WHERE status != 'void'
    LOOP
        -- Calculate sum of all allocations for this invoice
        SELECT COALESCE(SUM(allocated_amount + COALESCE(write_off_amount, 0)), 0)
        INTO v_total_allocated
        FROM ar_receipt_allocations
        WHERE invoice_id = v_rec.id;
        
        -- Check if there is a desync
        IF v_rec.paid_amount != v_total_allocated OR v_rec.balance != (v_rec.total_amount - v_total_allocated) THEN
            
            -- Determine new status
            IF v_total_allocated >= v_rec.total_amount THEN
                v_new_status := 'paid';
            ELSIF v_total_allocated > 0 THEN
                v_new_status := 'partial';
            ELSE
                v_new_status := 'unpaid';
            END IF;
            
            UPDATE ar_invoices
            SET 
                paid_amount = v_total_allocated,
                balance = v_rec.total_amount - v_total_allocated,
                status = v_new_status,
                updated_at = now()
            WHERE id = v_rec.id;
            
            v_ar_count := v_ar_count + 1;
        END IF;
    END LOOP;
    
    v_results := jsonb_build_object(
        'reconciled_ap_invoices', v_ap_count,
        'reconciled_ar_invoices', v_ar_count,
        'status', 'success',
        'timestamp', now()
    );
    
    RETURN v_results;
END;
$$;

-- Note: To run this, execute: SELECT reconcile_all_invoice_balances();
