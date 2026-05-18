-- Backfill journal_entry_id for Petty Cash Transactions
-- Match based on reference logic used in createPettyCashTransaction and useCreatePettyCashTopUp

UPDATE public.petty_cash_transactions pct
SET journal_entry_id = je.id
FROM public.journal_entries je
WHERE pct.journal_entry_id IS NULL
AND (
    je.reference = pct.voucher_number OR 
    je.reference = pct.receipt_number OR 
    je.reference = pct.reference_number OR 
    je.reference = 'PC-TXN-' || substring(pct.id::text from 1 for 8)
);
