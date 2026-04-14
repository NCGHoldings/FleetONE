-- Fix existing COA balances for posted SBS journal entries
-- This recalculates balances based on all posted journal entries

-- First, calculate the correct balance adjustments per account
WITH journal_adjustments AS (
  SELECT 
    jel.account_id,
    coa.account_type,
    SUM(
      CASE 
        WHEN coa.account_type IN ('asset', 'expense') THEN (COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0))
        ELSE (COALESCE(jel.credit, 0) - COALESCE(jel.debit, 0))
      END
    ) as total_adjustment
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  JOIN chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.status = 'posted'
    AND je.entry_number LIKE 'SBS%'
  GROUP BY jel.account_id, coa.account_type
)
UPDATE chart_of_accounts
SET 
  current_balance = COALESCE(current_balance, 0) + COALESCE(ja.total_adjustment, 0),
  updated_at = now()
FROM journal_adjustments ja
WHERE chart_of_accounts.id = ja.account_id;

-- Also create a trigger for future direct inserts with 'posted' status
-- This ensures any future modules that insert directly with posted status will also update COA balances
CREATE OR REPLACE FUNCTION public.update_account_balances_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'posted' THEN
    -- Update each account affected by this journal entry
    UPDATE public.chart_of_accounts coa
    SET 
      current_balance = current_balance + COALESCE(
        (SELECT 
          CASE 
            WHEN coa.account_type IN ('asset', 'expense') THEN SUM(COALESCE(jel.debit, 0) - COALESCE(jel.credit, 0))
            ELSE SUM(COALESCE(jel.credit, 0) - COALESCE(jel.debit, 0))
          END
        FROM public.journal_entry_lines jel
        WHERE jel.journal_entry_id = NEW.id
          AND jel.account_id = coa.id
        ), 0),
      updated_at = now()
    WHERE id IN (
      SELECT DISTINCT account_id 
      FROM public.journal_entry_lines 
      WHERE journal_entry_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_account_balances_on_insert_trigger ON public.journal_entries;

CREATE TRIGGER update_account_balances_on_insert_trigger
AFTER INSERT ON public.journal_entries
FOR EACH ROW
WHEN (NEW.status = 'posted')
EXECUTE FUNCTION public.update_account_balances_on_insert();