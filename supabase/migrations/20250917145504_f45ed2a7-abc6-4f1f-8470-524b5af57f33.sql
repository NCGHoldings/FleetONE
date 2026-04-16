-- Reset quotation QUO-2025-0001 for payment testing
-- First delete document storage records that reference the payments
DELETE FROM public.document_storage 
WHERE payment_id IN ('5d055319-d7fd-488e-98bc-7b734204ccad', '5293c38e-2f38-451d-bce2-8a00b48caf54');

-- Then delete the payments
DELETE FROM public.special_hire_payments 
WHERE quotation_id = '776313de-4fd1-48ac-963b-1aa84a98777b';

-- Finally reset quotation payment fields and status
UPDATE public.special_hire_quotations 
SET 
  total_paid = 0,
  advance_paid = 0,
  balance_due = (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + COALESCE(commission_pass_through_amount, 0) + COALESCE(total_additional_charges, 0) - COALESCE(discount_amount_lkr, 0)),
  trip_status = 'confirmed',
  status_changed_at = now(),
  updated_at = now()
WHERE quotation_no = 'QUO-2025-0001';