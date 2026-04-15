-- ==================================================================
-- NCG FLEETFLOW SECURITY HARDENING SCRIPT (PHASE 4 - RPC FUNCTIONS)
-- Locks down Mutable Search Path Exploit on all SECURITY DEFINER functions
-- ==================================================================

-- This powerful DO block dynamically scans the database's internal catalog 
-- for all 'SECURITY DEFINER' functions in the public schema and automatically 
-- forces them to run securely within the 'public' search_path.

DO $$
DECLARE
    func_record RECORD;
    alter_stmt TEXT;
BEGIN
    FOR func_record IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS func_name,
            pg_get_function_identity_arguments(p.oid) AS func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosecdef = true -- Specifically targeting SECURITY DEFINER functions
    LOOP
        -- Construct the ALTER function statement dynamically matching exact argument signatures
        alter_stmt := format('ALTER FUNCTION %I.%I(%s) SET search_path = public;',
                             func_record.schema_name, func_record.func_name, func_record.func_args);
        
        -- Execute the lock down
        EXECUTE alter_stmt;
        
        RAISE NOTICE 'Secured function: %.(%)', func_record.func_name, func_record.func_args;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
