-- 1. Unlink from Petty Cash Transactions
UPDATE public.petty_cash_transactions
SET journal_entry_id = NULL
WHERE journal_entry_id IN (
    SELECT je.id
    FROM public.journal_entries je
    LEFT JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    GROUP BY je.id
    HAVING COUNT(jel.id) = 0 OR COALESCE(SUM(jel.debit), 0) = 0
);

-- 2. Nullify the self-referencing foreign key so we can delete the corrupt records
UPDATE public.journal_entries
SET reversed_entry_id = NULL
WHERE reversed_entry_id IN (
    SELECT je.id
    FROM public.journal_entries je
    LEFT JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    GROUP BY je.id
    HAVING COUNT(jel.id) = 0 OR COALESCE(SUM(jel.debit), 0) = 0
);

-- 3. Delete corrupt JEs
DELETE FROM public.journal_entries
WHERE id NOT IN (SELECT journal_entry_id FROM public.journal_entry_lines GROUP BY journal_entry_id);
