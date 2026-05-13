-- =============================================================================
-- FIX: Yutong GL Pipeline — Add notes column + remediate misclassified JEs
-- Date: 2026-05-13
-- Scope: journal_entries schema fix + revenue misclassification remediation
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- PART 1: Add missing `notes` column to journal_entries
-- The postVehicleInvoiceToGL function inserts a `notes` field but the column
-- did not exist, causing 400 errors on every GL sync attempt.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.journal_entries.notes IS 'Optional free-text notes for the journal entry (e.g. linked invoice number)';


-- ──────────────────────────────────────────────────────────────────────────────
-- PART 2: DIAGNOSTIC — Identify orphaned/broken Yutong JE headers
-- These are JE headers that were created but whose lines failed to insert
-- because the `notes` column error killed the transaction mid-way.
-- ──────────────────────────────────────────────────────────────────────────────
-- View orphan YUT JEs (headers with no lines)
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM journal_entries je
  WHERE je.business_unit_code = 'YUT'
    AND je.status = 'posted'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    );
  RAISE NOTICE '🔍 Found % orphaned YUT journal entries (header only, no lines)', orphan_count;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- PART 3: Clean up orphan JE headers (no lines = no accounting effect)
-- Mark them as 'void' so they don't show as "Posted" with empty lines.
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE journal_entries
SET status = 'void',
    notes = 'Auto-voided: orphan JE with no lines (notes column migration fix)'
WHERE business_unit_code = 'YUT'
  AND status = 'posted'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = journal_entries.id
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- PART 4: Unlink voided orphan JEs from AR invoices
-- So the "Sync GL" button becomes available again for affected invoices.
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE ar_invoices
SET journal_entry_id = NULL
WHERE journal_entry_id IN (
  SELECT id FROM journal_entries
  WHERE business_unit_code = 'YUT'
    AND status = 'void'
    AND notes LIKE '%orphan JE%'
);


-- ──────────────────────────────────────────────────────────────────────────────
-- PART 5: DIAGNOSTIC — Identify Yutong JEs hitting wrong revenue account
-- Look for JE lines that credit a Light Vehicle / Rental account but belong
-- to Yutong (YUT) business unit entries.
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  misclassified_count INT;
BEGIN
  SELECT COUNT(*) INTO misclassified_count
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  JOIN chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.business_unit_code = 'YUT'
    AND je.status = 'posted'
    AND jel.credit > 0
    AND (
      coa.account_name ILIKE '%light vehicle%'
      OR coa.account_name ILIKE '%rental income%light%'
      OR coa.account_code LIKE '4150%'  -- Rental income codes
    );
  RAISE NOTICE '🔍 Found % Yutong JE lines hitting Light Vehicle/Rental accounts (misclassified)', misclassified_count;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- PART 6: REMEDIATE — Fix misclassified Yutong revenue JE lines
-- Redirect credit lines from Light Vehicle/Rental accounts to the correct
-- Yutong Sales revenue account via item_categories lookup.
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_yutong_revenue_id UUID;
  v_holding_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_wrong_account_ids UUID[];
  v_fixed INT := 0;
BEGIN
  -- Resolve the correct Yutong Sales revenue account from item_categories
  SELECT sales_account_id INTO v_yutong_revenue_id
  FROM item_categories
  WHERE category_name = 'Yutong Sales'
    AND company_id = v_holding_id
    AND is_active = true
  LIMIT 1;

  IF v_yutong_revenue_id IS NULL THEN
    RAISE WARNING '⚠️ Could not find Yutong Sales category for company %. Skipping remediation.', v_holding_id;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Yutong Sales revenue account resolved: %', v_yutong_revenue_id;

  -- Collect the wrong account IDs (Light Vehicle / Rental Income accounts)
  SELECT ARRAY_AGG(DISTINCT coa.id) INTO v_wrong_account_ids
  FROM chart_of_accounts coa
  WHERE coa.company_id = v_holding_id
    AND (
      coa.account_name ILIKE '%light vehicle%'
      OR coa.account_name ILIKE '%rental income%light%'
      OR coa.account_code LIKE '4150%'
    )
    AND coa.id <> v_yutong_revenue_id;

  IF v_wrong_account_ids IS NULL OR array_length(v_wrong_account_ids, 1) IS NULL THEN
    RAISE NOTICE 'ℹ️ No wrong Light Vehicle/Rental accounts found. Nothing to remediate.';
    RETURN;
  END IF;

  -- Update the misclassified JE lines
  UPDATE journal_entry_lines jel
  SET account_id = v_yutong_revenue_id,
      description = regexp_replace(jel.description, 'Light Vehicle|LTV', 'YUT', 'gi')
  FROM journal_entries je
  WHERE jel.journal_entry_id = je.id
    AND je.business_unit_code = 'YUT'
    AND je.status = 'posted'
    AND jel.credit > 0
    AND jel.account_id = ANY(v_wrong_account_ids);

  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % Yutong JE lines: redirected from Light Vehicle → Yutong Sales (%)', v_fixed, v_yutong_revenue_id;

  -- Recalculate COA balances for affected accounts
  -- (We'll let the application-level balance recalc handle this,
  --  or you can run the recalculateCOABalances utility from the Finance Automation tab)
  IF v_fixed > 0 THEN
    RAISE NOTICE '⚠️ Run COA balance recalculation from Finance Hub > Automation > GL Guardian to synchronize balances.';
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- PART 7: VERIFICATION — Show current state of Yutong JEs
-- ──────────────────────────────────────────────────────────────────────────────
SELECT 
  je.entry_number,
  je.entry_date,
  je.status,
  je.description,
  coa.account_code,
  coa.account_name,
  jel.debit,
  jel.credit
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.business_unit_code = 'YUT'
  AND je.status = 'posted'
ORDER BY je.entry_date DESC, je.entry_number, jel.debit DESC
LIMIT 50;
