-- 1. Ensure the trigger is active (in case you haven't run it since the restore)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_invoices' AND column_name='created_by') THEN
        ALTER TABLE public.ar_invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION set_universal_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ar_invoices_created_by ON public.ar_invoices;
CREATE TRIGGER trg_set_ar_invoices_created_by
BEFORE INSERT ON public.ar_invoices
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

-- 2. Backfill existing AR Invoices that say "System"
-- Look up the quotation that generated the invoice, and copy the user who created it
UPDATE ar_invoices inv
SET created_by = q.created_by
FROM special_hire_quotations q
WHERE inv.created_by IS NULL
  AND inv.reference = q.quotation_no
  AND q.created_by IS NOT NULL;

-- 3. Update any remaining ones to the current user (you) just so they don't say System
UPDATE ar_invoices
SET created_by = auth.uid()
WHERE created_by IS NULL;
