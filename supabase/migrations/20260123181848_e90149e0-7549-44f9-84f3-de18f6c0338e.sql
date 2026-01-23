-- =============================================
-- Special Hire Finance Integration Migration
-- Adds columns and functions for AR/Customer linking
-- =============================================

-- 1. Add finance customer and AR invoice links to quotations
ALTER TABLE special_hire_quotations
ADD COLUMN IF NOT EXISTS finance_customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES ar_invoices(id);

-- 2. Add AR links to payments
ALTER TABLE special_hire_payments
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES ar_invoices(id),
ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES ar_receipts(id),
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id);

-- 3. Create function to get or create SPH customer
CREATE OR REPLACE FUNCTION create_or_get_sph_customer(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Try to find existing customer by name first (most reliable for SPH)
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = p_company_id
    AND LOWER(name) = LOWER(p_customer_name)
  LIMIT 1;
  
  -- If not found by name, try phone or email
  IF v_customer_id IS NULL AND (p_customer_phone IS NOT NULL OR p_customer_email IS NOT NULL) THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE company_id = p_company_id
      AND (
        (p_customer_phone IS NOT NULL AND phone = p_customer_phone)
        OR (p_customer_email IS NOT NULL AND email = p_customer_email)
      )
    LIMIT 1;
  END IF;
  
  -- Create new customer if not found
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (
      company_id, 
      name, 
      phone, 
      email, 
      customer_type, 
      business_unit_code, 
      is_active
    )
    VALUES (
      p_company_id, 
      p_customer_name, 
      p_customer_phone, 
      p_customer_email,
      'individual', 
      'SPH', 
      true
    )
    RETURNING id INTO v_customer_id;
  END IF;
  
  RETURN v_customer_id;
END;
$$;

-- 4. Create function to generate AR invoice number for SPH
CREATE OR REPLACE FUNCTION generate_sph_ar_invoice_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'SPH-AR';
  v_year TEXT := TO_CHAR(CURRENT_DATE, 'YY');
  v_month TEXT := TO_CHAR(CURRENT_DATE, 'MM');
  v_sequence INT;
  v_invoice_number TEXT;
BEGIN
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM 'SPH-AR-\d{4}-(\d+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM ar_invoices
  WHERE company_id = p_company_id
    AND invoice_number LIKE 'SPH-AR-' || v_year || v_month || '-%';
  
  v_invoice_number := v_prefix || '-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- 5. Create function to generate AR receipt number for SPH
CREATE OR REPLACE FUNCTION generate_sph_ar_receipt_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'SPH-RCT';
  v_year TEXT := TO_CHAR(CURRENT_DATE, 'YY');
  v_month TEXT := TO_CHAR(CURRENT_DATE, 'MM');
  v_sequence INT;
  v_receipt_number TEXT;
BEGIN
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(receipt_number FROM 'SPH-RCT-\d{4}-(\d+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM ar_receipts
  WHERE company_id = p_company_id
    AND receipt_number LIKE 'SPH-RCT-' || v_year || v_month || '-%';
  
  v_receipt_number := v_prefix || '-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_receipt_number;
END;
$$;

-- 6. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_special_hire_quotations_finance_customer 
ON special_hire_quotations(finance_customer_id);

CREATE INDEX IF NOT EXISTS idx_special_hire_quotations_ar_invoice 
ON special_hire_quotations(ar_invoice_id);

CREATE INDEX IF NOT EXISTS idx_special_hire_payments_ar_invoice 
ON special_hire_payments(ar_invoice_id);

CREATE INDEX IF NOT EXISTS idx_special_hire_payments_journal_entry 
ON special_hire_payments(journal_entry_id);

-- 7. Add index on customers for SPH business unit lookup
CREATE INDEX IF NOT EXISTS idx_customers_business_unit_code 
ON customers(business_unit_code);

-- 8. Add index on ar_invoices for SPH business unit lookup
CREATE INDEX IF NOT EXISTS idx_ar_invoices_business_unit_code 
ON ar_invoices(business_unit_code);