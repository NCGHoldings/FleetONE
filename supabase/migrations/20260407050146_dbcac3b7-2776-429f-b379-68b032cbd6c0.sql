
-- Insert missing numbering sequences (skip if already exists for that entity_type)
INSERT INTO public.numbering_sequences (entity_type, prefix, include_year, include_month, separator, padding_length, next_number, is_active)
SELECT * FROM (VALUES
  ('credit_note', 'CN', true, false, '-', 5, 1, true),
  ('debit_note', 'DN', true, false, '-', 5, 1, true),
  ('rfq', 'RFQ', true, false, '-', 5, 1, true),
  ('so', 'SO', true, false, '-', 5, 1, true),
  ('qi', 'QI', true, false, '-', 5, 1, true),
  ('stock_transfer', 'ST', true, false, '-', 5, 1, true),
  ('budget', 'BUD', true, false, '-', 5, 1, true),
  ('payment_batch', 'PB', true, false, '-', 5, 1, true)
) AS v(entity_type, prefix, include_year, include_month, separator, padding_length, next_number, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.numbering_sequences ns WHERE ns.entity_type = v.entity_type AND ns.company_id IS NULL
);
