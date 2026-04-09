
-- Create company expense category settings table
CREATE TABLE public.company_expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_value TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, category_value)
);

-- Enable RLS
ALTER TABLE public.company_expense_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view category settings"
  ON public.company_expense_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert category settings"
  ON public.company_expense_categories FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update category settings"
  ON public.company_expense_categories FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete category settings"
  ON public.company_expense_categories FOR DELETE
  TO authenticated USING (true);

-- Add IOU numbering sequence (for each company that has numbering_sequences)
INSERT INTO public.numbering_sequences (entity_type, prefix, padding_length, next_number, company_id)
SELECT 'iou', 'IOU', 6, 1, company_id
FROM (SELECT DISTINCT company_id FROM public.numbering_sequences WHERE company_id IS NOT NULL) sq
WHERE NOT EXISTS (
  SELECT 1 FROM public.numbering_sequences ns
  WHERE ns.entity_type = 'iou' AND ns.company_id = sq.company_id
);

-- Also add a global fallback
INSERT INTO public.numbering_sequences (entity_type, prefix, padding_length, next_number, company_id)
SELECT 'iou', 'IOU', 6, 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.numbering_sequences WHERE entity_type = 'iou' AND company_id IS NULL
);
