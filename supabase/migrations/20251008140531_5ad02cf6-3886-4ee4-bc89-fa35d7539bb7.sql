-- Update the trigger function to sync all payment-related fields
CREATE OR REPLACE FUNCTION public.update_student_payment_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the student's payment balance, current amount due, and payment tracking fields
  UPDATE public.school_students
  SET 
    payment_balance = NEW.payment_balance_after,
    current_amount_due = GREATEST(0, fixed_monthly_amount - NEW.payment_balance_after),
    payment_amount = NEW.amount_paid,
    last_payment_date = NEW.payment_date,
    payment_status = CASE
      WHEN NEW.payment_balance_after >= fixed_monthly_amount THEN 'paid'
      WHEN NEW.payment_balance_after > 0 THEN 'pending'
      ELSE 'overdue'
    END,
    updated_at = now()
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$function$;