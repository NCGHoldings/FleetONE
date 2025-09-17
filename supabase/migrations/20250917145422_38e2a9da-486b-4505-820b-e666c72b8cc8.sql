-- Reset quotation QUO-2025-0001 for payment testing
-- Delete existing payments
DELETE FROM public.special_hire_payments 
WHERE quotation_id = '776313de-4fd1-48ac-963b-1aa84a98777b';

-- Reset quotation payment fields and status
UPDATE public.special_hire_quotations 
SET 
  total_paid = 0,
  advance_paid = 0,
  balance_due = (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + COALESCE(commission_pass_through_amount, 0) + COALESCE(total_additional_charges, 0) - COALESCE(discount_amount_lkr, 0)),
  trip_status = 'confirmed',
  status_changed_at = now(),
  updated_at = now()
WHERE quotation_no = 'QUO-2025-0001';