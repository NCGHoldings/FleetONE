-- ==========================================================
-- FULL REVERSAL AUDIT FOR APRIL 2026
-- Run each PART separately in Supabase SQL Editor
-- ==========================================================


-- PART 1: Show ALL reversed + reversal entries side-by-side
-- Both original (status=reversed) and REV- entry should appear in table
SELECT 
  CASE 
    WHEN je.is_reversal = true OR je.entry_number ILIKE 'REV-%' THEN '🔄 REVERSAL'
    WHEN je.status = 'reversed' THEN '❌ ORIGINAL (Reversed)'
    ELSE '✅ NORMAL'
  END AS entry_type,
  je.entry_number,
  je.entry_date,
  je.description,
  je.status,
  je.total_debit,
  je.total_credit,
  je.is_reversal,
  je.reversed_entry_id,
  je.source_module,
  je.business_unit_code,
  je.created_at
FROM journal_entries je
WHERE je.entry_date >= '2026-04-01'
  AND je.entry_date <= '2026-04-30'
  AND (
    je.status = 'reversed'              -- originals that were reversed
    OR je.is_reversal = true            -- reversal entries with flag
    OR je.entry_number ILIKE 'REV-%'    -- reversal entries by naming
  )
ORDER BY je.created_at DESC;


-- PART 2: Pair check - verify both original AND reversal exist and are tagged
SELECT 
  orig.entry_number AS original_entry,
  orig.entry_date AS orig_date,
  orig.status AS orig_status,
  orig.total_debit AS orig_debit,
  orig.total_credit AS orig_credit,
  orig.reversed_entry_id AS orig_links_to,
  '↔' AS link,
  rev.entry_number AS reversal_entry,
  rev.entry_date AS rev_date,
  rev.status AS rev_status,
  rev.total_debit AS rev_debit,
  rev.total_credit AS rev_credit,
  rev.reversed_entry_id AS rev_links_to,
  rev.is_reversal AS rev_flagged,
  -- Audit checks
  CASE WHEN orig.status != 'reversed' THEN '⚠️ Original NOT marked reversed' ELSE '✅' END AS check_orig_status,
  CASE WHEN rev.status != 'posted' THEN '⚠️ Reversal NOT posted' ELSE '✅' END AS check_rev_status,
  CASE WHEN rev.is_reversal != true THEN '⚠️ Reversal NOT flagged' ELSE '✅' END AS check_rev_flag,
  CASE WHEN rev.reversed_entry_id != orig.id THEN '⚠️ Reversal NOT linked to original' ELSE '✅' END AS check_rev_link,
  CASE WHEN orig.reversed_entry_id IS NULL OR orig.reversed_entry_id != rev.id 
    THEN '⚠️ Original NOT linked back to reversal' ELSE '✅' END AS check_orig_link,
  CASE WHEN rev.total_debit != orig.total_credit OR rev.total_credit != orig.total_debit 
    THEN '⚠️ Amounts NOT swapped correctly' ELSE '✅' END AS check_amounts
FROM journal_entries orig
JOIN journal_entries rev ON rev.reversed_entry_id = orig.id AND rev.id != orig.id
WHERE orig.entry_date >= '2026-04-01'
  AND orig.entry_date <= '2026-04-30'
  AND (rev.is_reversal = true OR rev.entry_number ILIKE 'REV-%')
ORDER BY orig.created_at DESC;


-- PART 3: Orphaned reversals (REV entry exists but original is missing or not tagged)
SELECT 
  rev.entry_number AS orphan_reversal,
  rev.entry_date,
  rev.description,
  rev.status,
  rev.total_debit,
  rev.total_credit,
  rev.reversed_entry_id,
  CASE 
    WHEN rev.reversed_entry_id IS NULL THEN '❌ No reversed_entry_id set at all'
    WHEN orig.id IS NULL THEN '❌ Original entry DELETED or missing'
    WHEN orig.status != 'reversed' THEN '⚠️ Original exists but status is: ' || orig.status
    ELSE '✅ OK'
  END AS issue
FROM journal_entries rev
LEFT JOIN journal_entries orig ON rev.reversed_entry_id = orig.id
WHERE (rev.is_reversal = true OR rev.entry_number ILIKE 'REV-%')
  AND rev.entry_date >= '2026-04-01'
  AND rev.entry_date <= '2026-04-30'
  AND (
    rev.reversed_entry_id IS NULL
    OR orig.id IS NULL
    OR orig.status != 'reversed'
  )
ORDER BY rev.entry_date DESC;


-- PART 4: Originals marked reversed but NO reversal entry exists
SELECT 
  orig.entry_number AS orphan_original,
  orig.entry_date,
  orig.description,
  orig.status,
  orig.total_debit,
  orig.total_credit,
  orig.reversed_entry_id,
  CASE 
    WHEN orig.reversed_entry_id IS NULL THEN '❌ No link to reversal entry'
    WHEN rev.id IS NULL THEN '❌ Linked reversal entry DELETED or missing'
    ELSE '✅ OK'
  END AS issue
FROM journal_entries orig
LEFT JOIN journal_entries rev ON orig.reversed_entry_id = rev.id
WHERE orig.status = 'reversed'
  AND orig.entry_date >= '2026-04-01'
  AND orig.entry_date <= '2026-04-30'
  AND (
    orig.reversed_entry_id IS NULL
    OR rev.id IS NULL
  )
ORDER BY orig.entry_date DESC;


-- PART 5: CRITICAL - Unbalanced reversal entries (line totals dont match)
SELECT 
  je.entry_number,
  je.entry_date,
  je.description,
  je.source_module,
  SUM(jel.debit) AS line_total_debit,
  SUM(jel.credit) AS line_total_credit,
  SUM(jel.debit) - SUM(jel.credit) AS imbalance,
  je.total_debit AS header_debit,
  je.total_credit AS header_credit
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE (je.is_reversal = true OR je.entry_number ILIKE 'REV-%' OR je.status = 'reversed')
  AND je.entry_date >= '2026-04-01'
  AND je.entry_date <= '2026-04-30'
GROUP BY je.id, je.entry_number, je.entry_date, je.description, je.source_module, je.total_debit, je.total_credit
HAVING ABS(SUM(jel.debit) - SUM(jel.credit)) > 0.01
ORDER BY je.entry_date DESC;
