-- Migration: Auto-reconcile historical AR and AP transactions
-- This will link the JEs of fully paid invoices to their respective payments/receipts in the GL.

DO $$ 
DECLARE
  inv_record RECORD;
  new_recon_id UUID;
  total_debit NUMERIC;
  total_credit NUMERIC;
  line_count INTEGER;
BEGIN
  -- 1. Auto-Reconcile AR Invoices and AR Receipts
  FOR inv_record IN 
    SELECT id, invoice_number 
    FROM ar_invoices 
    WHERE balance = 0
  LOOP
    new_recon_id := gen_random_uuid();
    
    -- Calculate totals for the un-reconciled lines belonging to this invoice and its receipts
    SELECT 
        COALESCE(SUM(jel.debit), 0), 
        COALESCE(SUM(jel.credit), 0),
        COUNT(jel.id)
    INTO total_debit, total_credit, line_count
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE coa.account_name ILIKE '%Trade Receivable%'
    AND jel.reconciliation_id IS NULL
    AND (
      (je.source_module = 'ar_invoice' AND je.reference = inv_record.invoice_number)
      OR
      (je.source_module = 'ar_receipt' AND je.reference IN (
          SELECT receipt_number FROM ar_receipts WHERE id IN (
              SELECT receipt_id FROM ar_receipt_allocations WHERE invoice_id = inv_record.id
          )
      ))
    );

    -- If debits equal credits and there is more than one line (invoice + at least one receipt), reconcile them
    IF line_count > 1 AND total_debit = total_credit AND total_debit > 0 THEN
      UPDATE journal_entry_lines
      SET reconciliation_id = new_recon_id
      WHERE id IN (
        SELECT jel.id
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE coa.account_name ILIKE '%Trade Receivable%'
        AND jel.reconciliation_id IS NULL
        AND (
          (je.source_module = 'ar_invoice' AND je.reference = inv_record.invoice_number)
          OR
          (je.source_module = 'ar_receipt' AND je.reference IN (
              SELECT receipt_number FROM ar_receipts WHERE id IN (
                  SELECT receipt_id FROM ar_receipt_allocations WHERE invoice_id = inv_record.id
              )
          ))
        )
      );
    END IF;
  END LOOP;

  -- 2. Auto-Reconcile AP Invoices and AP Payments
  FOR inv_record IN 
    SELECT id, invoice_number 
    FROM ap_invoices 
    WHERE balance = 0
  LOOP
    new_recon_id := gen_random_uuid();
    
    SELECT 
        COALESCE(SUM(jel.debit), 0), 
        COALESCE(SUM(jel.credit), 0),
        COUNT(jel.id)
    INTO total_debit, total_credit, line_count
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE coa.account_name ILIKE '%Trade Payable%'
    AND jel.reconciliation_id IS NULL
    AND (
      (je.source_module = 'ap_invoice' AND je.reference = inv_record.invoice_number)
      OR
      (je.source_module = 'ap_payment' AND je.reference IN (
          SELECT payment_number FROM ap_payments WHERE id IN (
              SELECT payment_id FROM ap_payment_allocations WHERE invoice_id = inv_record.id
          )
      ))
    );

    IF line_count > 1 AND total_debit = total_credit AND total_debit > 0 THEN
      UPDATE journal_entry_lines
      SET reconciliation_id = new_recon_id
      WHERE id IN (
        SELECT jel.id
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE coa.account_name ILIKE '%Trade Payable%'
        AND jel.reconciliation_id IS NULL
        AND (
          (je.source_module = 'ap_invoice' AND je.reference = inv_record.invoice_number)
          OR
          (je.source_module = 'ap_payment' AND je.reference IN (
              SELECT payment_number FROM ap_payments WHERE id IN (
                  SELECT payment_id FROM ap_payment_allocations WHERE invoice_id = inv_record.id
              )
          ))
        )
      );
    END IF;
  END LOOP;

END $$;
