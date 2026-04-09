-- Fix students with zero balance but outstanding amount due
UPDATE public.school_students 
SET payment_balance = -(current_amount_due) 
WHERE payment_balance = 0 
  AND current_amount_due > 0 
  AND is_active = true;