-- ============================================================================
-- Migration: Add opening_balance and balance_locked to chart_of_accounts
-- Purpose:   Enable persistent opening balances that survive recalculation,
--            and a lock flag to prevent accidental balance overwrites.
-- Date:      2026-05-13
-- ============================================================================

DO $$
BEGIN
  -- Add opening_balance column (starting point for balance calculation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chart_of_accounts'
      AND column_name = 'opening_balance'
  ) THEN
    ALTER TABLE public.chart_of_accounts
      ADD COLUMN opening_balance NUMERIC(18,2) DEFAULT 0;
    
    COMMENT ON COLUMN public.chart_of_accounts.opening_balance IS
      'Manual opening balance from prior periods or system migration. Included in current_balance calculations: current_balance = opening_balance + sum(JE movements).';
    
    RAISE NOTICE 'Added opening_balance column to chart_of_accounts';
  ELSE
    RAISE NOTICE 'opening_balance column already exists — skipping';
  END IF;

  -- Add balance_locked column (prevents automated recalculation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chart_of_accounts'
      AND column_name = 'balance_locked'
  ) THEN
    ALTER TABLE public.chart_of_accounts
      ADD COLUMN balance_locked BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN public.chart_of_accounts.balance_locked IS
      'When true, prevents automated recalculation from overwriting current_balance. Requires manual unlock before balance can be recalculated.';
    
    RAISE NOTICE 'Added balance_locked column to chart_of_accounts';
  ELSE
    RAISE NOTICE 'balance_locked column already exists — skipping';
  END IF;
END $$;
