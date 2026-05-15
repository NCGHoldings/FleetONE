-- Migration: Allow a single bus to be assigned to multiple routes simultaneously
-- Dropping the unique constraint on bus_id in fleet_master_roster

DO $$
BEGIN
    ALTER TABLE IF EXISTS public.fleet_master_roster
    DROP CONSTRAINT IF EXISTS fleet_master_roster_bus_id_key;
EXCEPTION
    WHEN undefined_object THEN
        -- Constraint doesn't exist, ignore
        NULL;
END $$;
