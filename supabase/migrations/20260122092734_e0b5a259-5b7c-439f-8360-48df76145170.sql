-- Create numbering_sequences table for auto-numbering configuration
CREATE TABLE public.numbering_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  entity_type TEXT NOT NULL,
  prefix TEXT NOT NULL,
  include_year BOOLEAN DEFAULT true,
  include_month BOOLEAN DEFAULT false,
  separator TEXT DEFAULT '-',
  padding_length INTEGER DEFAULT 4,
  next_number INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, entity_type)
);

-- Enable RLS
ALTER TABLE public.numbering_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view numbering sequences for their company"
ON public.numbering_sequences FOR SELECT
USING (company_id IS NULL OR company_id IN (
  SELECT id FROM companies WHERE is_active = true
));

CREATE POLICY "Users can insert numbering sequences"
ON public.numbering_sequences FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update numbering sequences"
ON public.numbering_sequences FOR UPDATE
USING (true);

-- Create index
CREATE INDEX idx_numbering_sequences_company ON public.numbering_sequences(company_id);
CREATE INDEX idx_numbering_sequences_entity ON public.numbering_sequences(entity_type);

-- Create function to generate entity numbers
CREATE OR REPLACE FUNCTION public.generate_entity_number(
  p_entity_type TEXT,
  p_company_id UUID DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_number TEXT;
  v_seq_part TEXT;
  v_year_part TEXT;
  v_month_part TEXT;
BEGIN
  -- Get configuration (company-specific first, then global fallback)
  SELECT * INTO v_config FROM numbering_sequences 
  WHERE entity_type = p_entity_type 
    AND (company_id = p_company_id OR company_id IS NULL)
    AND is_active = true
  ORDER BY company_id NULLS LAST
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Return default format if no config exists
    RETURN UPPER(p_entity_type) || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  END IF;
  
  -- Build number with prefix
  v_number := v_config.prefix;
  
  -- Add year if configured
  IF v_config.include_year THEN
    v_year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    v_number := v_number || v_config.separator || v_year_part;
  END IF;
  
  -- Add month if configured
  IF v_config.include_month THEN
    v_month_part := TO_CHAR(NOW(), 'MM');
    v_number := v_number || v_month_part;
  END IF;
  
  -- Add padded sequence number
  v_seq_part := LPAD(v_config.next_number::TEXT, v_config.padding_length, '0');
  v_number := v_number || v_config.separator || v_seq_part;
  
  -- Increment sequence
  UPDATE numbering_sequences 
  SET next_number = next_number + 1, updated_at = NOW()
  WHERE id = v_config.id;
  
  RETURN v_number;
END;
$$;

-- Seed default configurations (global, no company_id)
INSERT INTO numbering_sequences (company_id, entity_type, prefix, include_year, include_month, padding_length, separator) VALUES
  (NULL, 'customer', 'CUST', true, false, 4, '-'),
  (NULL, 'vendor', 'VND', true, false, 4, '-'),
  (NULL, 'item', 'ITM', true, false, 5, '-'),
  (NULL, 'ar_invoice', 'INV', true, false, 5, '-'),
  (NULL, 'ap_invoice', 'BILL', true, false, 5, '-'),
  (NULL, 'payment', 'PAY', true, false, 5, '-'),
  (NULL, 'receipt', 'RCP', true, false, 5, '-'),
  (NULL, 'journal', 'JV', true, false, 5, '-'),
  (NULL, 'grn', 'GRN', true, false, 5, '-'),
  (NULL, 'po', 'PO', true, false, 5, '-');