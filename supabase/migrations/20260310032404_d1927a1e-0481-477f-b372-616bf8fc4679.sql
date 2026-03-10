
-- Step 1: Drop duplicate trigger that causes race condition on student balance updates
-- Keep only 'update_student_balance_on_payment_trigger' which handles both balance + FIFO
DROP TRIGGER IF EXISTS update_balance_after_payment ON public.school_payment_transactions;

-- Also drop the function if it's no longer needed
DROP FUNCTION IF EXISTS public.update_student_balance_after_payment();
