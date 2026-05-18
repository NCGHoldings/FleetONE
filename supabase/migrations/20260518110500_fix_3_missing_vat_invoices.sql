-- Fix 3 School Bus AR invoices that were created without VAT allocation
-- because vat_output_account_id was not configured at generation time.
-- This script: 1) reduces the income credit line, 2) inserts VAT line, 3) updates ar_invoices

DO $$
DECLARE
  rec RECORD;
  v_vat_account_id UUID;
  v_base_amount NUMERIC;
  v_vat_amount NUMERIC;
  v_income_line_id UUID;
  v_fixed INT := 0;
BEGIN
  -- Process each AR invoice that has NO VAT line in its JE
  FOR rec IN
    SELECT 
      i.id AS ar_id,
      i.invoice_number,
      i.total_amount,
      i.journal_entry_id,
      je.company_id
    FROM ar_invoices i
    JOIN journal_entries je ON je.id = i.journal_entry_id
    WHERE (i.tax_amount IS NULL OR i.tax_amount = 0)
      AND i.journal_entry_id IS NOT NULL
      AND i.total_amount > 0
      AND i.business_unit_code = 'SBO'
      -- Only target invoices whose JE has NO existing VAT line
      AND NOT EXISTS (
        SELECT 1 FROM journal_entry_lines jel
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE jel.journal_entry_id = i.journal_entry_id
          AND (coa.account_code LIKE '223%' OR coa.account_name ILIKE '%vat%')
      )
  LOOP
    -- Find the VAT Control account for this company
    SELECT id INTO v_vat_account_id
    FROM chart_of_accounts
    WHERE account_code = '22304000'
      AND company_id = rec.company_id
    LIMIT 1;

    IF v_vat_account_id IS NULL THEN
      RAISE NOTICE 'Skipping % - no VAT account found for company %', rec.invoice_number, rec.company_id;
      CONTINUE;
    END IF;

    -- Calculate 18% inclusive VAT
    v_base_amount := ROUND(rec.total_amount / 1.18, 2);
    v_vat_amount  := ROUND(rec.total_amount - v_base_amount, 2);

    -- Find the income/collection credit line (the non-receivable line)
    SELECT jel.id INTO v_income_line_id
    FROM journal_entry_lines jel
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE jel.journal_entry_id = rec.journal_entry_id
      AND jel.credit > 0
      AND coa.account_code NOT LIKE '122%'  -- not trade receivable
    LIMIT 1;

    IF v_income_line_id IS NULL THEN
      RAISE NOTICE 'Skipping % - no income credit line found', rec.invoice_number;
      CONTINUE;
    END IF;

    -- Step 1: Reduce income credit line to base amount (excl VAT)
    UPDATE journal_entry_lines
    SET credit = v_base_amount,
        description = description || ' (Excl. VAT)'
    WHERE id = v_income_line_id;

    -- Step 2: Insert VAT control credit line
    INSERT INTO journal_entry_lines (
      journal_entry_id, account_id, description, debit, credit, company_id
    ) VALUES (
      rec.journal_entry_id,
      v_vat_account_id,
      'VAT Output (18% Inclusive) - backfill fix',
      0,
      v_vat_amount,
      rec.company_id
    );

    -- Step 3: Update AR invoice with tax_amount and subtotal
    UPDATE ar_invoices
    SET tax_amount = v_vat_amount,
        subtotal = v_base_amount
    WHERE id = rec.ar_id;

    v_fixed := v_fixed + 1;
    RAISE NOTICE 'Fixed %: base=%, vat=%', rec.invoice_number, v_base_amount, v_vat_amount;
  END LOOP;

  RAISE NOTICE 'Total invoices fixed: %', v_fixed;
END $$;
