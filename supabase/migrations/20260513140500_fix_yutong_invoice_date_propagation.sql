-- Fix backdated invoice date propagation for YTO-2026-0035
-- Invoice NCGH-YT-CI-260095 was backdated to 2026-04-10 but posted with 2026-05-12
-- This migration corrects the AR Invoice date AND its linked Journal Entry date

-- Step 1: Get the correct invoice date from yutong_invoice_records
-- The source of truth is the yutong_invoice_records table where invoice_date = 2026-04-10

-- Step 2: Fix the AR Invoice date
DO $$
DECLARE
  v_ar_id UUID;
  v_je_id UUID;
  v_correct_date DATE;
  v_invoice_no TEXT := 'NCGH-YT-CI-260095';
BEGIN
  -- Look up the correct date from yutong_invoice_records
  SELECT invoice_date INTO v_correct_date
  FROM yutong_invoice_records
  WHERE invoice_no = v_invoice_no
  LIMIT 1;

  IF v_correct_date IS NULL THEN
    RAISE NOTICE 'Invoice record % not found in yutong_invoice_records, skipping.', v_invoice_no;
    RETURN;
  END IF;

  RAISE NOTICE 'Correct date for %: %', v_invoice_no, v_correct_date;

  -- Find the AR invoice by matching the reference or invoice_number
  SELECT id, journal_entry_id INTO v_ar_id, v_je_id
  FROM ar_invoices
  WHERE invoice_number ILIKE '%260095%'
     OR reference ILIKE '%260095%'
  LIMIT 1;

  IF v_ar_id IS NOT NULL THEN
    -- Update AR Invoice date
    UPDATE ar_invoices
    SET invoice_date = v_correct_date
    WHERE id = v_ar_id;
    RAISE NOTICE 'Updated AR Invoice % date to %', v_ar_id, v_correct_date;

    -- Update linked Journal Entry date
    IF v_je_id IS NOT NULL THEN
      UPDATE journal_entries
      SET entry_date = v_correct_date
      WHERE id = v_je_id;
      RAISE NOTICE 'Updated linked JE % date to %', v_je_id, v_correct_date;
    END IF;
  ELSE
    RAISE NOTICE 'No AR invoice found matching 260095.';
  END IF;

  -- Also fix any JEs referencing this order that have wrong dates
  -- The order number is YTO-2026-0035
  UPDATE journal_entries
  SET entry_date = v_correct_date
  WHERE (reference ILIKE '%YTO-2026-0035%' OR description ILIKE '%YTO-2026-0035%')
    AND entry_date = '2026-05-12'
    AND source_module = 'yutong_sales'
    AND status = 'posted';

  RAISE NOTICE 'Fixed all JEs referencing YTO-2026-0035 with wrong date 2026-05-12 → %', v_correct_date;
END $$;
