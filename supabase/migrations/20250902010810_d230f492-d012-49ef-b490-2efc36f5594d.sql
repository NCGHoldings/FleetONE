
-- 1) Remove implicit fixed commission by setting default to 0
ALTER TABLE public.special_hire_quotations
  ALTER COLUMN commission_pct SET DEFAULT 0;

COMMENT ON COLUMN public.special_hire_quotations.commission_pct IS
'Total commission to pay to third parties (%) for this quotation. Default 0. This is an expense.';

-- Ensure commission_amount has a safe default (should already be 0)
ALTER TABLE public.special_hire_quotations
  ALTER COLUMN commission_amount SET DEFAULT 0;

-- 2) Add pass-through fields to capture customer-side commission portion
ALTER TABLE public.special_hire_quotations
  ADD COLUMN IF NOT EXISTS commission_pass_through_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_pass_through_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.special_hire_quotations.commission_pass_through_pct IS
'Portion of commission (%) passed to customer as a surcharge. Must be <= commission_pct.';

COMMENT ON COLUMN public.special_hire_quotations.commission_pass_through_amount IS
'Calculated amount passed to the customer as a surcharge due to commission.';

-- 3) Add validation to prevent invalid splits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_quo_commission_pass_through_bounds'
      AND conrelid = 'public.special_hire_quotations'::regclass
  ) THEN
    ALTER TABLE public.special_hire_quotations
      ADD CONSTRAINT chk_quo_commission_pass_through_bounds
      CHECK (
        commission_pct >= 0
        AND commission_pass_through_pct >= 0
        AND commission_pass_through_pct <= commission_pct
      );
  END IF;
END$$;

-- Optional: annotate percentage_adjustment meaning (already exists)
COMMENT ON COLUMN public.special_hire_quotations.percentage_adjustment IS
'General price adjustment applied to customer total. Positive = surcharge, Negative = discount. Does not affect expenses.';
