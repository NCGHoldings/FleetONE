-- Safe script to clean up corrupt JEs (0 lines or 0 amount)

-- 1. Create a temporary table to store the IDs of corrupt JEs
CREATE TEMP TABLE corrupt_jes AS
SELECT je.id
FROM public.journal_entries je
LEFT JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
GROUP BY je.id
HAVING COUNT(jel.id) = 0 OR COALESCE(SUM(jel.debit), 0) = 0;

-- 2. Unlink from all known transaction tables
UPDATE public.petty_cash_transactions SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.ap_payments SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.ap_invoices SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.expense_requests SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.bank_transactions SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.ar_invoices SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.ar_receipts SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM corrupt_jes);

-- 3. Unlink self-referencing reversal key
UPDATE public.journal_entries SET reversed_entry_id = NULL WHERE reversed_entry_id IN (SELECT id FROM corrupt_jes);
UPDATE public.journal_entries SET reversed_entry_id = NULL WHERE id IN (SELECT id FROM corrupt_jes);

-- 4. Finally, safely delete the corrupt JEs
DELETE FROM public.journal_entries WHERE id IN (SELECT id FROM corrupt_jes);

DROP TABLE corrupt_jes;
