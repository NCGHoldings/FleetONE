-- ============================================================
-- GL INTEGRITY AUDIT SCRIPT
-- Run this in Supabase SQL Editor to check all 34 financial flows
-- ============================================================

-- ============================================================
-- 1. OVERALL JOURNAL ENTRY HEALTH CHECK
-- ============================================================
SELECT '=== JOURNAL ENTRY SUMMARY ===' as section;

SELECT 
    status,
    COUNT(*) as total_entries,
    COALESCE(SUM(total_debit), 0) as total_debits,
    COALESCE(SUM(total_credit), 0) as total_credits,
    CASE 
        WHEN ABS(COALESCE(SUM(total_debit), 0) - COALESCE(SUM(total_credit), 0)) < 0.01 
        THEN '✅ BALANCED' 
        ELSE '❌ IMBALANCED' 
    END as balance_status
FROM journal_entries
GROUP BY status
ORDER BY status;

-- ============================================================
-- 2. CHECK FOR UNBALANCED JOURNAL ENTRIES (Critical!)
-- ============================================================
SELECT '=== UNBALANCED ENTRIES (SHOULD BE EMPTY) ===' as section;

SELECT 
    je.id,
    je.reference_number,
    je.description,
    je.entry_date,
    je.total_debit,
    je.total_credit,
    ABS(je.total_debit - je.total_credit) as imbalance,
    (SELECT COUNT(*) FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id) as line_count
FROM journal_entries je
WHERE ABS(COALESCE(je.total_debit, 0) - COALESCE(je.total_credit, 0)) > 0.01
ORDER BY je.entry_date DESC
LIMIT 20;

-- ============================================================
-- 3. CHECK LINE-LEVEL BALANCE (DR sum = CR sum per entry)
-- ============================================================
SELECT '=== LINE-LEVEL BALANCE CHECK ===' as section;

SELECT 
    jel.journal_entry_id,
    je.reference_number,
    je.description,
    SUM(jel.debit) as sum_debit,
    SUM(jel.credit) as sum_credit,
    ABS(SUM(jel.debit) - SUM(jel.credit)) as line_imbalance,
    CASE 
        WHEN ABS(SUM(jel.debit) - SUM(jel.credit)) < 0.01 
        THEN '✅ OK' 
        ELSE '❌ MISMATCH' 
    END as status
FROM journal_entry_lines jel
JOIN journal_entries je ON je.id = jel.journal_entry_id
GROUP BY jel.journal_entry_id, je.reference_number, je.description
HAVING ABS(SUM(jel.debit) - SUM(jel.credit)) > 0.01
ORDER BY line_imbalance DESC
LIMIT 20;

-- ============================================================
-- 4. FLOW-BY-FLOW VERIFICATION (By Description Pattern)
-- ============================================================
SELECT '=== GL FLOWS BY MODULE ===' as section;

SELECT 
    CASE
        WHEN description ILIKE '%trip income%' OR description ILIKE '%ticket revenue%' OR description ILIKE '%ncg%trip%' THEN '🚌 NCG Express - Trip Income'
        WHEN description ILIKE '%trip expense%' OR description ILIKE '%fuel%toll%' THEN '🚌 NCG Express - Trip Expenses'
        WHEN description ILIKE '%vehicle sale%' OR description ILIKE '%yutong%' OR description ILIKE '%bus sale%' THEN '🚗 Vehicle Sales'
        WHEN description ILIKE '%lease%' OR description ILIKE '%emi%' OR description ILIKE '%installment%' THEN '📋 Leasing'
        WHEN description ILIKE '%expense request%' OR description ILIKE '%expense claim%' THEN '💳 Expense Requests'
        WHEN description ILIKE '%special hire%' OR description ILIKE '%charter%' THEN '🚐 Special Hire'
        WHEN description ILIKE '%insurance%premium%' OR description ILIKE '%insurance%claim%' THEN '🛡️ Insurance'
        WHEN description ILIKE '%payroll%' OR description ILIKE '%salary%' OR description ILIKE '%wage%' THEN '👥 Payroll'
        WHEN description ILIKE '%fuel%' THEN '⛽ Fuel Expense'
        WHEN description ILIKE '%commission%' THEN '💰 Commission'
        WHEN description ILIKE '%school%' OR description ILIKE '%student%fee%' THEN '🏫 School Bus'
        WHEN description ILIKE '%permit%' OR description ILIKE '%route permit%' THEN '📄 Route Permits'
        WHEN description ILIKE '%bank fee%' OR description ILIKE '%bank charge%' THEN '🏦 Bank Fees'
        WHEN description ILIKE '%transfer%' OR description ILIKE '%inter-bank%' THEN '🔄 Inter-Bank Transfer'
        WHEN description ILIKE '%maintenance%' OR description ILIKE '%repair%' OR description ILIKE '%job card%' THEN '🔧 Maintenance'
        WHEN description ILIKE '%landed cost%' THEN '📦 Landed Cost'
        WHEN description ILIKE '%advance%' THEN '💵 Advance/Deposit'
        WHEN description ILIKE '%refund%' THEN '↩️ Refund'
        ELSE '❓ Other / Manual'
    END as module_flow,
    COUNT(*) as entry_count,
    COALESCE(SUM(total_debit), 0)::DECIMAL(15,2) as total_dr,
    COALESCE(SUM(total_credit), 0)::DECIMAL(15,2) as total_cr,
    MIN(entry_date) as earliest,
    MAX(entry_date) as latest
FROM journal_entries
GROUP BY module_flow
ORDER BY entry_count DESC;

-- ============================================================
-- 5. ORPHAN CHECK: JE Lines without valid Account IDs
-- ============================================================
SELECT '=== ORPHAN LINES (Missing GL Account) ===' as section;

SELECT 
    jel.id as line_id,
    je.reference_number,
    je.description,
    jel.account_id,
    jel.debit,
    jel.credit,
    CASE 
        WHEN coa.id IS NULL THEN '❌ MISSING ACCOUNT' 
        ELSE '✅ OK' 
    END as account_status
FROM journal_entry_lines jel
JOIN journal_entries je ON je.id = jel.journal_entry_id
LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE coa.id IS NULL
LIMIT 20;

-- ============================================================
-- 6. RECENT ACTIVITY: Last 20 Journal Entries
-- ============================================================
SELECT '=== LAST 20 JOURNAL ENTRIES ===' as section;

SELECT 
    je.id,
    je.entry_date,
    je.reference_number,
    LEFT(je.description, 60) as description,
    je.status,
    je.total_debit,
    je.total_credit,
    (SELECT COUNT(*) FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id) as legs,
    je.created_at
FROM journal_entries je
ORDER BY je.created_at DESC
LIMIT 20;

-- ============================================================
-- 7. EXPENSE REQUEST GL CHECK
-- ============================================================
SELECT '=== EXPENSE REQUESTS GL STATUS ===' as section;

SELECT 
    COALESCE(gl_posted::text, 'false') as gl_posted,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount
FROM expense_requests
GROUP BY gl_posted;

-- ============================================================
-- 8. LANDED COST VOUCHER STATUS
-- ============================================================
SELECT '=== LANDED COST VOUCHERS ===' as section;

SELECT 
    status,
    COUNT(*) as count,
    COALESCE(SUM(total_additional_cost), 0) as total_cost
FROM landed_cost_vouchers
GROUP BY status;

-- ============================================================
-- 9. AP INVOICES LINKED TO GL
-- ============================================================
SELECT '=== AP INVOICES GL LINK ===' as section;

SELECT 
    CASE WHEN journal_entry_id IS NOT NULL THEN '✅ Linked' ELSE '❌ No JE' END as gl_status,
    status,
    COUNT(*) as count,
    COALESCE(SUM(total_amount), 0) as total_amount
FROM ap_invoices
GROUP BY gl_status, status
ORDER BY gl_status, status;

-- ============================================================
-- 10. AR INVOICES LINKED TO GL
-- ============================================================
SELECT '=== AR INVOICES GL LINK ===' as section;

SELECT 
    CASE WHEN journal_entry_id IS NOT NULL THEN '✅ Linked' ELSE '❌ No JE' END as gl_status,
    status,
    COUNT(*) as count,
    COALESCE(SUM(total_amount), 0) as total_amount
FROM ar_invoices
GROUP BY gl_status, status
ORDER BY gl_status, status;

-- ============================================================
-- 11. OVERALL SYSTEM HEALTH SCORE
-- ============================================================
SELECT '=== OVERALL GL HEALTH SCORE ===' as section;

WITH metrics AS (
    SELECT 
        (SELECT COUNT(*) FROM journal_entries) as total_je,
        (SELECT COUNT(*) FROM journal_entries WHERE ABS(COALESCE(total_debit,0) - COALESCE(total_credit,0)) > 0.01) as unbalanced_je,
        (SELECT COUNT(*) FROM journal_entry_lines jel LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id WHERE coa.id IS NULL) as orphan_lines,
        (SELECT COUNT(*) FROM journal_entries WHERE status = 'posted') as posted_je,
        (SELECT COUNT(DISTINCT DATE_TRUNC('day', created_at)) FROM journal_entries WHERE created_at > NOW() - INTERVAL '30 days') as active_days_30d
)
SELECT 
    total_je as "Total JEs",
    posted_je as "Posted JEs",
    unbalanced_je as "Unbalanced (should be 0)",
    orphan_lines as "Orphan Lines (should be 0)",
    active_days_30d as "Active Days (last 30)",
    CASE 
        WHEN unbalanced_je = 0 AND orphan_lines = 0 THEN '🟢 EXCELLENT - All entries balanced'
        WHEN unbalanced_je <= 2 THEN '🟡 WARNING - Minor issues detected'
        ELSE '🔴 CRITICAL - Review immediately'
    END as health_status
FROM metrics;
