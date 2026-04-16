-- Fix security issue by updating the function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_yutong_quotation_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_quotation_seq');
  RETURN 'YTQ-' || lpad(seq_val::text, 6, '0');
END;
$$;