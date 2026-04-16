-- Fix existing students with positive payment_balance (should be negative for outstanding debt)
UPDATE public.school_students 
SET payment_balance = -(payment_balance) 
WHERE payment_balance > 0 AND is_active = true;