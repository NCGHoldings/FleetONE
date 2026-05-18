-- Migration: Fix Staff Registry Deletion Constraints
-- Description: Updates the petty_cash_funds foreign key to SET NULL on delete so that test staff can be deleted without constraint errors.

ALTER TABLE IF EXISTS public.petty_cash_funds
    DROP CONSTRAINT IF EXISTS petty_cash_funds_custodian_id_fkey;

ALTER TABLE IF EXISTS public.petty_cash_funds
    ADD CONSTRAINT petty_cash_funds_custodian_id_fkey
    FOREIGN KEY (custodian_id)
    REFERENCES public.staff_registry(id)
    ON DELETE SET NULL;
