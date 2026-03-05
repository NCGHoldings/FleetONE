
-- Cheque Books table
CREATE TABLE public.cheque_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  prefix TEXT DEFAULT '',
  start_number INTEGER NOT NULL,
  end_number INTEGER NOT NULL,
  next_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cheque_books_bank_account ON public.cheque_books(bank_account_id);
CREATE INDEX idx_cheque_books_company ON public.cheque_books(company_id);
CREATE INDEX idx_cheque_books_active ON public.cheque_books(bank_account_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.cheque_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cheque books"
  ON public.cheque_books FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cheque books"
  ON public.cheque_books FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cheque books"
  ON public.cheque_books FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_cheque_books_updated_at
  BEFORE UPDATE ON public.cheque_books
  FOR EACH ROW EXECUTE FUNCTION public.update_governance_updated_at();

-- RPC: get_next_cheque_number
-- Atomically fetches and increments the next cheque number for a bank account
CREATE OR REPLACE FUNCTION public.get_next_cheque_number(p_bank_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_book RECORD;
  v_cheque_number TEXT;
  v_remaining INTEGER;
BEGIN
  -- Find the active cheque book for this bank account
  SELECT * INTO v_book
  FROM public.cheque_books
  WHERE bank_account_id = p_bank_account_id
    AND is_active = true
    AND next_number <= end_number
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active cheque book found for this bank account, or all cheque books are exhausted.'
    );
  END IF;

  -- Format the cheque number with prefix
  IF v_book.prefix IS NOT NULL AND v_book.prefix != '' THEN
    v_cheque_number := v_book.prefix || LPAD(v_book.next_number::TEXT, 6, '0');
  ELSE
    v_cheque_number := LPAD(v_book.next_number::TEXT, 6, '0');
  END IF;

  v_remaining := v_book.end_number - v_book.next_number;

  -- Increment next_number
  UPDATE public.cheque_books
  SET next_number = next_number + 1,
      updated_at = now()
  WHERE id = v_book.id;

  -- If book is now exhausted, deactivate it
  IF v_book.next_number + 1 > v_book.end_number THEN
    UPDATE public.cheque_books
    SET is_active = false, updated_at = now()
    WHERE id = v_book.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cheque_number', v_cheque_number,
    'book_id', v_book.id,
    'remaining', v_remaining
  );
END;
$$;
