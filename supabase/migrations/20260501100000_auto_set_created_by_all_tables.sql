-- Migration: Universal 'created_by' auto-population for all finance documents
-- Ensures that 'System' is no longer displayed when a human user creates a document.

-- 1. Ensure 'created_by' column exists on all relevant tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_invoices' AND column_name='created_by') THEN
        ALTER TABLE public.ar_invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ar_receipts' AND column_name='created_by') THEN
        ALTER TABLE public.ar_receipts ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ap_invoices' AND column_name='created_by') THEN
        ALTER TABLE public.ap_invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ap_payments' AND column_name='created_by') THEN
        ALTER TABLE public.ap_payments ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='special_hire_payments' AND column_name='created_by') THEN
        ALTER TABLE public.special_hire_payments ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='special_hire_invoices' AND column_name='created_by') THEN
        ALTER TABLE public.special_hire_invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Create the universal trigger function
CREATE OR REPLACE FUNCTION set_universal_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically grab the user ID from the Supabase auth context if the client forgot to send it
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger to all tables
DROP TRIGGER IF EXISTS trg_set_ar_invoices_created_by ON public.ar_invoices;
CREATE TRIGGER trg_set_ar_invoices_created_by
BEFORE INSERT ON public.ar_invoices
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

DROP TRIGGER IF EXISTS trg_set_ar_receipts_created_by ON public.ar_receipts;
CREATE TRIGGER trg_set_ar_receipts_created_by
BEFORE INSERT ON public.ar_receipts
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

DROP TRIGGER IF EXISTS trg_set_ap_invoices_created_by ON public.ap_invoices;
CREATE TRIGGER trg_set_ap_invoices_created_by
BEFORE INSERT ON public.ap_invoices
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

DROP TRIGGER IF EXISTS trg_set_ap_payments_created_by ON public.ap_payments;
CREATE TRIGGER trg_set_ap_payments_created_by
BEFORE INSERT ON public.ap_payments
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

DROP TRIGGER IF EXISTS trg_set_special_hire_payments_created_by ON public.special_hire_payments;
CREATE TRIGGER trg_set_special_hire_payments_created_by
BEFORE INSERT ON public.special_hire_payments
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();

DROP TRIGGER IF EXISTS trg_set_special_hire_invoices_created_by ON public.special_hire_invoices;
CREATE TRIGGER trg_set_special_hire_invoices_created_by
BEFORE INSERT ON public.special_hire_invoices
FOR EACH ROW EXECUTE FUNCTION set_universal_created_by();
