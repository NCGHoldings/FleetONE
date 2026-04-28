-- Fix create_or_get_sph_customer RPC function
-- The previous version referenced 'name' instead of 'customer_name', which caused it to fall back to the JS implementation.

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
  v_customer_code TEXT;
BEGIN
  -- Try to find existing customer by name first (most reliable for SPH)
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = p_company_id
    AND LOWER(customer_name) = LOWER(p_customer_name)
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
    -- Generate unique SPH customer code
    v_customer_code := 'SPH-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

    INSERT INTO customers (
      company_id, 
      customer_code,
      customer_name, 
      phone, 
      email, 
      customer_type, 
      business_unit_code, 
      is_active
    )
    VALUES (
      p_company_id, 
      v_customer_code,
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
