-- Add trigger to automatically set created_by to the authenticated user's ID
CREATE OR REPLACE FUNCTION set_journal_entry_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- If created_by is not provided by the frontend, try to grab it from the auth context
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  -- If it's being inserted as "posted" right away, track who posted it
  IF NEW.status = 'posted' AND NEW.posted_by IS NULL THEN
    NEW.posted_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_journal_entry_created_by ON public.journal_entries;
CREATE TRIGGER trg_set_journal_entry_created_by
BEFORE INSERT ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION set_journal_entry_created_by();
