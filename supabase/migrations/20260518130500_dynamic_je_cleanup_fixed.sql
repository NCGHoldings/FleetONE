DO $$
DECLARE
    r RECORD;
    v_sql TEXT;
BEGIN
    -- 1. Create a temporary table to store the IDs of corrupt JEs
    CREATE TEMP TABLE corrupt_jes_temp ON COMMIT DROP AS
    SELECT je.id
    FROM public.journal_entries je
    LEFT JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    GROUP BY je.id
    HAVING COUNT(jel.id) = 0 OR COALESCE(SUM(jel.debit), 0) = 0;

    -- 2. Dynamically unlink from all tables that reference journal_entries.id 
    -- EXCLUDING journal_entry_lines which we will delete instead.
    FOR r IN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'journal_entries'
          AND ccu.column_name = 'id'
          AND tc.table_schema = 'public'
          AND tc.table_name != 'journal_entry_lines'
    ) LOOP
        -- Generate and execute dynamic UPDATE statement for each referencing table
        v_sql := format('UPDATE %I.%I SET %I = NULL WHERE %I IN (SELECT id FROM corrupt_jes_temp)', 
                        r.table_schema, r.table_name, r.column_name, r.column_name);
        EXECUTE v_sql;
    END LOOP;

    -- 3. Delete the 0-amount lines first (if any exist) to satisfy constraints
    DELETE FROM public.journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM corrupt_jes_temp);

    -- 4. Finally, safely delete the corrupt JEs
    DELETE FROM public.journal_entries WHERE id IN (SELECT id FROM corrupt_jes_temp);
END $$;
