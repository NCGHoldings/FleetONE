-- 1. Ensure the trigger is active and ALSO attach it to Journal Entries!
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_invoices' AND column_name='created_by') THEN
        ALTER TABLE public.ar_invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='created_by') THEN
        ALTER TABLE public.journal_entries ADD COLUMN created_by UUID REFERENCES auth.users(id);
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

DROP TRIGGER IF EXISTS trg_set_journal_entries_created_by ON public.journal_entries;
CREATE TRIGGER trg_set_journal_entries_created_by
BEFORE INSERT ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

-- 2. Backfill AR Invoices with the Finance Person who APPROVED the quotation
UPDATE ar_invoices inv
SET created_by = q.approved_by
FROM special_hire_quotations q
WHERE inv.created_by IS NULL
  AND inv.reference = q.quotation_no
  AND q.approved_by IS NOT NULL;

-- 3. Backfill Journal Entries with the same Finance Person
UPDATE journal_entries je
SET created_by = inv.created_by
FROM ar_invoices inv
WHERE je.created_by IS NULL
  AND je.id = inv.journal_entry_id
  AND inv.created_by IS NOT NULL;

-- 4. Catch any remaining orphaned ones and default them to current user so "System" disappears forever
UPDATE ar_invoices SET created_by = auth.uid() WHERE created_by IS NULL;
UPDATE journal_entries SET created_by = auth.uid() WHERE created_by IS NULL;
