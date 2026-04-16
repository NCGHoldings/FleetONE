-- Add description column to budgets table
ALTER TABLE public.budgets 
ADD COLUMN description TEXT;

COMMENT ON COLUMN public.budgets.description IS 'Brief description of the budget purpose and scope';