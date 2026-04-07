
-- Recalculate all COA balances from actual posted journal entry lines
UPDATE public.chart_of_accounts coa
SET current_balance = COALESCE(calc.net_balance, 0)
FROM (
  SELECT
    jel.account_id,
    CASE
      WHEN c.account_type IN ('asset', 'expense')
        THEN SUM(COALESCE(jel.debit, 0)) - SUM(COALESCE(jel.credit, 0))
      ELSE
        SUM(COALESCE(jel.credit, 0)) - SUM(COALESCE(jel.debit, 0))
    END AS net_balance
  FROM public.journal_entry_lines jel
  JOIN public.chart_of_accounts c ON c.id = jel.account_id
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  WHERE je.status = 'posted'
  GROUP BY jel.account_id, c.account_type
) calc
WHERE coa.id = calc.account_id;

-- Reset accounts with no posted JE lines to zero
UPDATE public.chart_of_accounts
SET current_balance = 0
WHERE id NOT IN (
  SELECT DISTINCT jel.account_id
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  WHERE je.status = 'posted'
    AND jel.account_id IS NOT NULL
)
AND current_balance != 0;
