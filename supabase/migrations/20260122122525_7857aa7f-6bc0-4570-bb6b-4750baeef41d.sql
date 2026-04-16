-- Add paid_amount and payment_id columns to school_ar_invoices
ALTER TABLE public.school_ar_invoices
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES school_payment_transactions(id);

-- Create function to apply payment to invoices (FIFO - oldest first)
CREATE OR REPLACE FUNCTION public.apply_payment_to_invoices(
  p_student_id UUID,
  p_payment_amount NUMERIC,
  p_payment_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_remaining_payment NUMERIC := p_payment_amount;
  v_applied_amount NUMERIC;
  v_total_applied NUMERIC := 0;
BEGIN
  -- Get unpaid invoices for student, oldest first (FIFO)
  FOR v_invoice IN
    SELECT id, amount, COALESCE(paid_amount, 0) as paid_amount
    FROM school_ar_invoices
    WHERE student_id = p_student_id
      AND status IN ('posted', 'partial')
    ORDER BY invoice_month ASC, created_at ASC
  LOOP
    EXIT WHEN v_remaining_payment <= 0;
    
    -- Calculate how much is still owed on this invoice
    v_applied_amount := LEAST(v_remaining_payment, v_invoice.amount - v_invoice.paid_amount);
    
    IF v_applied_amount > 0 THEN
      -- Update the invoice
      UPDATE school_ar_invoices
      SET 
        paid_amount = COALESCE(paid_amount, 0) + v_applied_amount,
        payment_id = p_payment_id,
        status = CASE 
          WHEN COALESCE(paid_amount, 0) + v_applied_amount >= amount THEN 'paid'
          ELSE 'partial'
        END
      WHERE id = v_invoice.id;
      
      v_remaining_payment := v_remaining_payment - v_applied_amount;
      v_total_applied := v_total_applied + v_applied_amount;
    END IF;
  END LOOP;
  
  RETURN v_total_applied;
END;
$$;

-- Create function to update student balance when payment is recorded
-- This ensures current_amount_due decreases after payment
CREATE OR REPLACE FUNCTION public.update_student_balance_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update student's current_amount_due and payment_balance
  UPDATE school_students
  SET 
    current_amount_due = GREATEST(0, current_amount_due - NEW.amount_paid),
    payment_balance = NEW.payment_balance_after,
    updated_at = NOW()
  WHERE id = NEW.student_id;
  
  -- Apply payment to invoices using FIFO
  PERFORM apply_payment_to_invoices(NEW.student_id, NEW.amount_paid, NEW.id);
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate with new function
DROP TRIGGER IF EXISTS update_student_balance_on_payment_trigger ON school_payment_transactions;

CREATE TRIGGER update_student_balance_on_payment_trigger
AFTER INSERT ON public.school_payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_student_balance_on_payment();