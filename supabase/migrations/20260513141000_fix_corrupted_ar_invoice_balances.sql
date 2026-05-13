-- Fix corrupted AR invoices where total_amount was zeroed during edit
-- This patches any AR invoice that has total_amount = 0 but has a linked JE with actual debits.
-- Root cause: the useUpdateARInvoice mutation was setting balance = total_amount without
-- preserving paid_amount, causing invoices to be falsely marked as PAID with 0 balance.

DO $$
DECLARE
  rec RECORD;
  fixed_count INT := 0;
BEGIN
  -- Find AR invoices with zero total that have linked JEs with actual amounts
  FOR rec IN
    SELECT 
      ari.id,
      ari.invoice_number,
      ari.total_amount AS old_total,
      ari.paid_amount AS old_paid,
      ari.balance AS old_balance,
      ari.status AS old_status,
      je.total_debit AS je_amount
    FROM ar_invoices ari
    JOIN journal_entries je ON je.id = ari.journal_entry_id
    WHERE ari.total_amount = 0
      AND je.total_debit > 0
  LOOP
    -- Restore total_amount from JE debit total
    UPDATE ar_invoices SET
      total_amount = rec.je_amount,
      balance = rec.je_amount - COALESCE(rec.old_paid, 0),
      status = CASE
        WHEN COALESCE(rec.old_paid, 0) >= rec.je_amount THEN 'paid'
        WHEN COALESCE(rec.old_paid, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END,
      updated_at = NOW()
    WHERE id = rec.id;

    fixed_count := fixed_count + 1;
    RAISE NOTICE 'Fixed invoice % (%) — restored total to % from JE',
      rec.invoice_number, rec.id, rec.je_amount;
  END LOOP;

  RAISE NOTICE 'Total AR invoices fixed: %', fixed_count;
END $$;
