
CREATE TABLE public.special_hire_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  remark_type text NOT NULL DEFAULT 'internal_note',
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_special_hire_remarks_quotation ON public.special_hire_remarks(quotation_id);
CREATE INDEX idx_special_hire_remarks_created ON public.special_hire_remarks(created_at DESC);

ALTER TABLE public.special_hire_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view remarks"
ON public.special_hire_remarks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert remarks"
ON public.special_hire_remarks FOR INSERT TO authenticated WITH CHECK (true);
