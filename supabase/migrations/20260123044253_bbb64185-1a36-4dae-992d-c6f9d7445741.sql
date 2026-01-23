-- Add paid_amount column to ar_invoices if not exists
ALTER TABLE ar_invoices 
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;

-- Function to sync school_ar_invoices payments to parent ar_invoices
CREATE OR REPLACE FUNCTION public.sync_school_ar_to_finance_ar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ar_invoice_id UUID;
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  -- Get the linked ar_invoice_id
  v_ar_invoice_id := NEW.ar_invoice_id;
  
  IF v_ar_invoice_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate total paid across all school invoices for this AR invoice
  SELECT 
    COALESCE(SUM(paid_amount), 0),
    COALESCE(SUM(amount), 0)
  INTO v_total_paid, v_total_amount
  FROM school_ar_invoices
  WHERE ar_invoice_id = v_ar_invoice_id;
  
  -- Update the Finance AR invoice
  UPDATE ar_invoices
  SET 
    balance = total_amount - v_total_paid,
    paid_amount = v_total_paid,
    status = CASE 
      WHEN v_total_paid >= total_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    updated_at = NOW()
  WHERE id = v_ar_invoice_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on school_ar_invoices
DROP TRIGGER IF EXISTS sync_school_ar_to_finance_trigger ON school_ar_invoices;

CREATE TRIGGER sync_school_ar_to_finance_trigger
AFTER UPDATE ON public.school_ar_invoices
FOR EACH ROW
WHEN (OLD.paid_amount IS DISTINCT FROM NEW.paid_amount OR OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.sync_school_ar_to_finance_ar();

-- Migrate existing SBS AR invoices to NCG Holding
UPDATE ar_invoices
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'
  AND invoice_number LIKE 'SBS-BATCH-%';

-- Migrate existing SBS customers to NCG Holding
UPDATE customers
SET 
  company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
WHERE company_id = '0fba4a2f-598b-47e8-b863-283d00380b06'
  AND customer_code LIKE 'SBS-%';

-- Sync paid amounts from school_ar_invoices to ar_invoices
UPDATE ar_invoices ar
SET 
  paid_amount = COALESCE(sub.total_paid, 0),
  balance = ar.total_amount - COALESCE(sub.total_paid, 0),
  status = CASE 
    WHEN COALESCE(sub.total_paid, 0) >= ar.total_amount THEN 'paid'
    WHEN COALESCE(sub.total_paid, 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END
FROM (
  SELECT ar_invoice_id, SUM(paid_amount) as total_paid
  FROM school_ar_invoices
  WHERE ar_invoice_id IS NOT NULL
  GROUP BY ar_invoice_id
) sub
WHERE ar.id = sub.ar_invoice_id;