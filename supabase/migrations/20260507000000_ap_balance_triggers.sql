-- Migration to add automated invoice balance reconciliation via triggers
-- This ensures ap_invoices and ar_invoices balances stay in sync with allocations

-- 1. Function for AP Invoices
CREATE OR REPLACE FUNCTION fn_update_ap_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_allocated NUMERIC;
    v_total_amount NUMERIC;
    v_new_status TEXT;
BEGIN
    -- Get the invoice ID from the affected allocation
    IF (TG_OP = 'DELETE') THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Calculate total allocations (allocated + wht + write_off)
    SELECT COALESCE(SUM(allocated_amount + COALESCE(wht_deducted, 0) + COALESCE(write_off_amount, 0)), 0)
    INTO v_total_allocated
    FROM ap_payment_allocations
    WHERE invoice_id = v_invoice_id;

    -- Get total amount from invoice
    SELECT total_amount INTO v_total_amount
    FROM ap_invoices
    WHERE id = v_invoice_id;

    -- Determine new status
    IF v_total_allocated >= v_total_amount THEN
        v_new_status := 'paid';
    ELSIF v_total_allocated > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'unpaid';
    END IF;

    -- Update the invoice
    UPDATE ap_invoices
    SET 
        paid_amount = v_total_allocated,
        balance = v_total_amount - v_total_allocated,
        status = v_new_status,
        updated_at = now()
    WHERE id = v_invoice_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger for AP Allocations
DROP TRIGGER IF EXISTS trg_update_ap_balance ON ap_payment_allocations;
CREATE TRIGGER trg_update_ap_balance
AFTER INSERT OR UPDATE OR DELETE ON ap_payment_allocations
FOR EACH ROW EXECUTE FUNCTION fn_update_ap_invoice_balance();


-- 3. Function for AR Invoices
CREATE OR REPLACE FUNCTION fn_update_ar_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_allocated NUMERIC;
    v_total_amount NUMERIC;
    v_new_status TEXT;
BEGIN
    -- Get the invoice ID from the affected allocation
    IF (TG_OP = 'DELETE') THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Calculate total allocations (allocated + write_off)
    SELECT COALESCE(SUM(allocated_amount + COALESCE(write_off_amount, 0)), 0)
    INTO v_total_allocated
    FROM ar_receipt_allocations
    WHERE invoice_id = v_invoice_id;

    -- Get total amount from invoice
    SELECT total_amount INTO v_total_amount
    FROM ar_invoices
    WHERE id = v_invoice_id;

    -- Determine new status
    IF v_total_allocated >= v_total_amount THEN
        v_new_status := 'paid';
    ELSIF v_total_allocated > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'unpaid';
    END IF;

    -- Update the invoice
    UPDATE ar_invoices
    SET 
        paid_amount = v_total_allocated,
        balance = v_total_amount - v_total_allocated,
        status = v_new_status,
        updated_at = now()
    WHERE id = v_invoice_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for AR Allocations
DROP TRIGGER IF EXISTS trg_update_ar_balance ON ar_receipt_allocations;
CREATE TRIGGER trg_update_ar_balance
AFTER INSERT OR UPDATE OR DELETE ON ar_receipt_allocations
FOR EACH ROW EXECUTE FUNCTION fn_update_ar_invoice_balance();


-- 5. Safety Triggers for AP/AR Invoices (Recalculate balance on total_amount change)
CREATE OR REPLACE FUNCTION fn_sync_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
    
    -- Update status based on new balance
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status := 'paid';
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status := 'partial';
    ELSE
        NEW.status := 'unpaid';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AP Invoices Header Trigger
DROP TRIGGER IF EXISTS trg_sync_ap_invoice_balance ON ap_invoices;
CREATE TRIGGER trg_sync_ap_invoice_balance
BEFORE UPDATE OF total_amount, paid_amount ON ap_invoices
FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_balance();

-- AR Invoices Header Trigger
DROP TRIGGER IF EXISTS trg_sync_ar_invoice_balance ON ar_invoices;
CREATE TRIGGER trg_sync_ar_invoice_balance
BEFORE UPDATE OF total_amount, paid_amount ON ar_invoices
FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_balance();
