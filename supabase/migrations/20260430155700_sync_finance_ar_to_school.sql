-- This trigger ensures that when an AR Invoice is marked as paid from the Finance Module,
-- it synchronizes the payment status back to the School Operations Module.

CREATE OR REPLACE FUNCTION sync_finance_ar_to_school_ar()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if the paid_amount or status has changed
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.paid_amount IS DISTINCT FROM NEW.paid_amount OR OLD.status IS DISTINCT FROM NEW.status) THEN
            
            -- Update the linked school AR invoice
            UPDATE school_ar_invoices
            SET 
                paid_amount = NEW.paid_amount,
                status = NEW.status
            WHERE ar_invoice_id = NEW.id;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to ar_invoices
DROP TRIGGER IF EXISTS trigger_sync_finance_ar_to_school_ar ON ar_invoices;
CREATE TRIGGER trigger_sync_finance_ar_to_school_ar
AFTER UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION sync_finance_ar_to_school_ar();

-- Also run an immediate backfill for any AR invoices that were already paid from the Finance side
-- but the operation side missed it.
UPDATE school_ar_invoices sai
SET 
    paid_amount = ai.paid_amount,
    status = ai.status
FROM ar_invoices ai
WHERE sai.ar_invoice_id = ai.id
  AND (sai.paid_amount IS DISTINCT FROM ai.paid_amount OR sai.status IS DISTINCT FROM ai.status);

-- The above UPDATE will trigger `trigger_sync_school_student_balance_inv`
-- which will then correctly recalculate all the student balances and statuses!
