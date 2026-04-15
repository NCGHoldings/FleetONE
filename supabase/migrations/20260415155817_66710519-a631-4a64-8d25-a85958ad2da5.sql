-- Reset all student balances to 0 for go-live (clean slate before first real billing cycle)
UPDATE public.school_students 
SET payment_balance = 0, 
    current_amount_due = 0,
    updated_at = NOW()
WHERE is_active = true;