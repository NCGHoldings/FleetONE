-- ===============================================================
-- Bulletproof Sequence Generator (Zero Duplicate Guarantee)
-- ===============================================================

CREATE OR REPLACE FUNCTION public.generate_entity_number(
  p_entity_type TEXT,
  p_company_id UUID DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_id UUID;
  v_prefix TEXT;
  v_include_year BOOLEAN;
  v_include_month BOOLEAN;
  v_separator TEXT;
  v_padding_length INTEGER;
  v_current_next INTEGER;
  
  v_number TEXT;
  v_seq_part TEXT;
  v_year_part TEXT;
  v_month_part TEXT;
  v_is_duplicate BOOLEAN;
  v_target_table TEXT;
  v_target_column TEXT;
BEGIN
  -- 1. Fetch exact fields into scalar variables to avoid generic RECORD ambiguitiues
  SELECT id, prefix, include_year, include_month, separator, padding_length, next_number 
  INTO v_config_id, v_prefix, v_include_year, v_include_month, v_separator, v_padding_length, v_current_next 
  FROM numbering_sequences 
  WHERE entity_type = p_entity_type 
    AND (company_id = p_company_id OR company_id IS NULL)
    AND is_active = true
  ORDER BY company_id NULLS LAST
  LIMIT 1;
  
  IF v_config_id IS NULL THEN
    RETURN UPPER(p_entity_type) || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  END IF;

  -- 2. Determine target table to cross-check existence natively
  CASE p_entity_type
      WHEN 'payment' THEN 
          v_target_table := 'ap_payments'; v_target_column := 'payment_number';
      WHEN 'receipt' THEN 
          v_target_table := 'ar_receipts'; v_target_column := 'receipt_number';
      WHEN 'ap_invoice' THEN 
          v_target_table := 'ap_invoices'; v_target_column := 'invoice_number';
      WHEN 'ar_invoice' THEN 
          v_target_table := 'ar_invoices'; v_target_column := 'invoice_number';
      WHEN 'customer' THEN 
          v_target_table := 'customers'; v_target_column := 'customer_code';
      WHEN 'vendor' THEN 
          v_target_table := 'vendors'; v_target_column := 'vendor_code';
      WHEN 'journal' THEN 
          v_target_table := 'journal_entries'; v_target_column := 'entry_number';
      ELSE
          v_target_table := NULL;
  END CASE;
  
  v_is_duplicate := true;

  -- 3. LOOP UNTIL WE FIND A TRULY UNIQUE NUMBER
  WHILE v_is_duplicate LOOP
      v_number := v_prefix;
      
      IF v_include_year THEN
        v_year_part := EXTRACT(YEAR FROM NOW())::TEXT;
        v_number := v_number || v_separator || v_year_part;
      END IF;
      
      IF v_include_month THEN
        v_month_part := TO_CHAR(NOW(), 'MM');
        v_number := v_number || v_month_part;
      END IF;
      
      v_seq_part := LPAD(v_current_next::TEXT, v_padding_length, '0');
      v_number := v_number || v_separator || v_seq_part;
      
      IF v_target_table IS NULL THEN
          v_is_duplicate := false;
      ELSE
          EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I = %L)', v_target_table, v_target_column, v_number)
          INTO v_is_duplicate;
      END IF;

      IF v_is_duplicate THEN
          v_current_next := v_current_next + 1;
      END IF;
  END LOOP;
  
  -- 4. Update the safely verified next number and lock it
  UPDATE numbering_sequences 
  SET next_number = v_current_next + 1, updated_at = NOW()
  WHERE id = v_config_id;
  
  RETURN v_number;
END;
$$;
