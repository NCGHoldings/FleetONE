-- Fix update_quotation_payment_totals to include total_additional_charges in balance_due calculation
CREATE OR REPLACE FUNCTION public.update_quotation_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.special_hire_quotations 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
      AND status = 'approved'
    ),
    advance_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id) 
      AND payment_type = 'advance'
      AND status = 'approved'
    ),
    balance_due = (
      (gross_revenue + 
       COALESCE(fuel_cost_fuel_only, 0) + 
       COALESCE(commission_pass_through_amount, 0) + 
       COALESCE(total_additional_charges, 0) -
       COALESCE(discount_amount_lkr, 0)) - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.special_hire_payments 
        WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
        AND status = 'approved'
      )
    )
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Repair all existing confirmed quotation balances to include total_additional_charges
UPDATE special_hire_quotations
SET balance_due = (
  gross_revenue + 
  COALESCE(fuel_cost_fuel_only, 0) + 
  COALESCE(commission_pass_through_amount, 0) + 
  COALESCE(total_additional_charges, 0) - 
  COALESCE(discount_amount_lkr, 0)
) - COALESCE(total_paid, 0)
WHERE status = 'confirmed';