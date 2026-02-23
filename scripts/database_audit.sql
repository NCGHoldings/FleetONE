-- ============================================================
-- 🔒 DATABASE SECURITY & DATA INTEGRITY AUDIT
-- Project: NCG FleetFlow (wwjpdszkmtnzshbulkon)
-- Run via: Supabase SQL Editor or psql
-- ============================================================
-- ────────────────────────────────────────────────────────────
-- 1. 🔴 TABLES WITHOUT RLS (Critical Security Risk)
-- Any table without RLS allows full access via the API
-- ────────────────────────────────────────────────────────────
SELECT '🔴 TABLES WITHOUT RLS ENABLED' as audit_check;
SELECT schemaname,
    tablename,
    '❌ NO RLS - EXPOSED VIA API' as risk
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename NOT IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
            AND tablename IN (
                SELECT relname
                FROM pg_class
                WHERE relrowsecurity = true
            )
    )
ORDER BY tablename;
-- ────────────────────────────────────────────────────────────
-- 2. 🔴 TABLES WITH RLS ENABLED BUT NO POLICIES
-- RLS is on but no policies = NO ONE can access the data
-- ────────────────────────────────────────────────────────────
SELECT '🔴 TABLES WITH RLS BUT NO POLICIES' as audit_check;
SELECT c.relname as table_name,
    '⚠️ RLS enabled but NO policies defined' as risk
FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.tablename = c.relname
            AND p.schemaname = 'public'
    );
-- ────────────────────────────────────────────────────────────
-- 3. 🟡 RLS POLICIES OVERVIEW (Check for overly permissive)
-- Look for policies that allow ALL or use auth.role() = 'anon'
-- ────────────────────────────────────────────────────────────
SELECT '🟡 ALL RLS POLICIES' as audit_check;
SELECT tablename,
    policyname,
    permissive,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename,
    policyname;
-- ────────────────────────────────────────────────────────────
-- 4. 🟡 ANON-ACCESSIBLE POLICIES (Publicly exposed data)
-- Policies allowing anon role = data visible without login
-- ────────────────────────────────────────────────────────────
SELECT '🟡 ANON-ACCESSIBLE POLICIES' as audit_check;
SELECT tablename,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies
WHERE schemaname = 'public'
    AND (
        roles::text LIKE '%anon%'
        OR qual::text LIKE '%anon%'
        OR with_check::text LIKE '%anon%'
    )
ORDER BY tablename;
-- ────────────────────────────────────────────────────────────
-- 5. 📊 TABLE ROW COUNTS (Find empty or suspicious tables)
-- ────────────────────────────────────────────────────────────
SELECT '📊 TABLE ROW COUNTS' as audit_check;
SELECT relname as table_name,
    n_live_tup as estimated_row_count,
    CASE
        WHEN n_live_tup = 0 THEN '⚠️ EMPTY'
        WHEN n_live_tup < 5 THEN '🟡 Very few rows'
        ELSE '✅ Has data'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
-- ────────────────────────────────────────────────────────────
-- 6. 🔗 SPECIAL HIRE QUOTATIONS STATUS
-- ────────────────────────────────────────────────────────────
SELECT '🔗 SPECIAL HIRE QUOTATIONS STATUS' as audit_check;
SELECT COUNT(*) as total_quotations,
    COUNT(*) FILTER (
        WHERE is_active_version = true
    ) as active_versions,
    COUNT(*) FILTER (
        WHERE is_active_version = false
    ) as inactive_versions,
    COUNT(*) FILTER (
        WHERE is_active_version IS NULL
    ) as null_versions,
    MIN(created_at) as earliest_quotation,
    MAX(created_at) as latest_quotation
FROM special_hire_quotations;
-- ────────────────────────────────────────────────────────────
-- 7. 🔗 ORPHANED RECORDS (Data integrity issues)
-- Records that reference deleted parent records
-- ────────────────────────────────────────────────────────────
SELECT '🔗 ORPHANED RECORDS CHECK' as audit_check;
-- Check for payments without quotations
SELECT 'special_hire_payments without quotation' as check_name,
    COUNT(*) as orphaned_count
FROM special_hire_payments p
WHERE NOT EXISTS (
        SELECT 1
        FROM special_hire_quotations q
        WHERE q.id = p.quotation_id
    );
-- Check for documents without linked records
SELECT 'documents with broken links' as check_name,
    COUNT(*) as orphaned_count
FROM documents d
WHERE linked_table = 'special_hire_quotations'
    AND linked_record_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM special_hire_quotations q
        WHERE q.id = d.linked_record_id
    );
-- ────────────────────────────────────────────────────────────
-- 8. 🔑 FOREIGN KEY RELATIONSHIPS MAP
-- Shows which tables link to which (CASCADE danger map)
-- ────────────────────────────────────────────────────────────
SELECT '🔑 FOREIGN KEY CASCADE MAP' as audit_check;
SELECT tc.table_name as child_table,
    kcu.column_name as fk_column,
    ccu.table_name as parent_table,
    ccu.column_name as parent_column,
    rc.delete_rule as on_delete,
    rc.update_rule as on_update,
    CASE
        WHEN rc.delete_rule = 'CASCADE' THEN '⚠️ CASCADE - parent delete removes child'
        WHEN rc.delete_rule = 'SET NULL' THEN '🟡 SET NULL - parent delete nullifies FK'
        WHEN rc.delete_rule = 'RESTRICT' THEN '✅ RESTRICT - prevents parent delete'
        WHEN rc.delete_rule = 'NO ACTION' THEN '✅ NO ACTION - prevents parent delete'
        ELSE rc.delete_rule
    END as risk_level
FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY parent_table,
    child_table;
-- ────────────────────────────────────────────────────────────
-- 9. 🧨 DANGEROUS MIGRATIONS SCAN
-- Check migration history for DELETE/TRUNCATE statements
-- ────────────────────────────────────────────────────────────
SELECT '🧨 MIGRATION HISTORY' as audit_check;
SELECT version,
    name,
    inserted_at as applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 30;
-- ────────────────────────────────────────────────────────────
-- 10. 🔐 FUNCTIONS WITH SECURITY DEFINER
-- These run with elevated privileges — potential attack vector
-- ────────────────────────────────────────────────────────────
SELECT '🔐 SECURITY DEFINER FUNCTIONS' as audit_check;
SELECT routine_name,
    routine_type,
    security_type,
    CASE
        WHEN security_type = 'DEFINER' THEN '⚠️ Runs with creator privileges'
        ELSE '✅ Runs with caller privileges'
    END as risk
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND security_type = 'DEFINER'
ORDER BY routine_name;
-- ────────────────────────────────────────────────────────────
-- 11. 📋 SEQUENCES CHECK (Quotation numbering)
-- ────────────────────────────────────────────────────────────
SELECT '📋 SEQUENCES CHECK' as audit_check;
SELECT sequencename,
    last_value,
    start_value,
    increment_by,
    max_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;
-- ────────────────────────────────────────────────────────────
-- 12. 🔍 TABLES WITHOUT PRIMARY KEYS
-- ────────────────────────────────────────────────────────────
SELECT '🔍 TABLES WITHOUT PRIMARY KEYS' as audit_check;
SELECT t.tablename
FROM pg_tables t
    LEFT JOIN (
        SELECT tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
    ) pk ON t.tablename = pk.table_name
WHERE t.schemaname = 'public'
    AND pk.table_name IS NULL;
-- ────────────────────────────────────────────────────────────
-- 13. 📏 LARGE TABLES (Performance check)
-- ────────────────────────────────────────────────────────────
SELECT '📏 TABLE SIZES' as audit_check;
SELECT relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as data_size,
    pg_size_pretty(
        pg_total_relation_size(relid) - pg_relation_size(relid)
    ) as index_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
-- ────────────────────────────────────────────────────────────
-- 14. 🔄 MISSING INDEXES ON FOREIGN KEYS
-- FK columns without indexes cause slow JOINs and deletes
-- ────────────────────────────────────────────────────────────
SELECT '🔄 FK COLUMNS WITHOUT INDEXES' as audit_check;
SELECT tc.table_name,
    kcu.column_name as fk_column,
    ccu.table_name as references_table,
    '⚠️ No index on FK column' as issue
FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes pi
        WHERE pi.tablename = tc.table_name
            AND pi.indexdef LIKE '%' || kcu.column_name || '%'
    )
ORDER BY tc.table_name;
-- ============================================================
-- ✅ AUDIT COMPLETE
-- ============================================================
SELECT '✅ DATABASE AUDIT COMPLETE' as status,
    now() as completed_at;