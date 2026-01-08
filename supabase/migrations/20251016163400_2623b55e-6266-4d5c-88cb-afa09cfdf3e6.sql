-- ================================================
-- COMPREHENSIVE SECURITY FIXES - PHASE 1
-- ================================================
-- This migration addresses:
-- 1. Receipt upload storage policy mismatch (CRITICAL)
-- 2. SQL injection in 14 SECURITY DEFINER functions (HIGH)
-- 3. Rate limiting infrastructure for public forms (MEDIUM)
-- ================================================

-- ================================================
-- FIX 1: Update Storage Policy for Anonymous Receipt Uploads
-- ================================================
-- Current issue: Policy requires auth.uid() in folder path but anonymous users have NULL uid
-- Fix: Allow anonymous uploads to branch_id/student_id folder structure

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Parents can upload receipts to school-receipts bucket" 
ON storage.objects;

-- Create new policy allowing anonymous uploads to branch/student folders
CREATE POLICY "Anonymous parents can upload receipts" 
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'school-receipts' 
  AND (storage.foldername(name))[1] IS NOT NULL  -- branch_id present
  AND (storage.foldername(name))[2] IS NOT NULL  -- student_id present
  AND length((storage.foldername(name))[1]::text) = 36  -- Valid UUID format for branch
  AND length((storage.foldername(name))[2]::text) = 36  -- Valid UUID format for student
);

-- Add SELECT policy for authenticated staff to view receipts
CREATE POLICY "Staff can view receipts" 
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'school-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- ================================================
-- FIX 2: Add search_path to All SECURITY DEFINER Functions
-- ================================================
-- Prevents SQL injection and privilege escalation attacks

-- Function 1: generate_employee_id
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  seq int;
BEGIN
  seq := nextval('public.employee_id_seq');
  RETURN 'EMP-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
END;
$function$;

-- Function 2: set_employee_id
CREATE OR REPLACE FUNCTION public.set_employee_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    NEW.employee_id = public.generate_employee_id();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 3: generate_yutong_order_no
CREATE OR REPLACE FUNCTION public.generate_yutong_order_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_order_seq');
  RETURN 'YTO-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$function$;

-- Function 4: generate_yutong_quotation_no
CREATE OR REPLACE FUNCTION public.generate_yutong_quotation_no(quotation_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  date_str TEXT;
  pattern TEXT;
  last_base_no TEXT;
  next_num INTEGER;
BEGIN
  date_str := TO_CHAR(quotation_date, 'YYYYMMDD');
  pattern := 'YTQ-' || date_str || '-%';
  
  SELECT REGEXP_REPLACE(quotation_no, '-v.*$', '') INTO last_base_no
  FROM yutong_quotations
  WHERE quotation_no LIKE pattern
  ORDER BY REGEXP_REPLACE(quotation_no, '-v.*$', '') DESC
  LIMIT 1;
  
  IF last_base_no IS NULL THEN
    next_num := 1;
  ELSE
    next_num := CAST(SUBSTRING(last_base_no FROM '\d{4}$') AS INTEGER) + 1;
  END IF;
  
  RETURN 'YTQ-' || date_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$function$;

-- Function 5: increment_name_suggestion
CREATE OR REPLACE FUNCTION public.increment_name_suggestion(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  INSERT INTO public.approval_name_suggestions (name, usage_count, last_used_at)
  VALUES (p_name, 1, now())
  ON CONFLICT (name) 
  DO UPDATE SET 
    usage_count = approval_name_suggestions.usage_count + 1,
    last_used_at = now();
END;
$function$;

-- Function 6: generate_customer_code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  seq INT;
BEGIN
  seq := nextval('public.yutong_customer_code_seq');
  RETURN 'YTC-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
END;
$function$;

-- Function 7: set_customer_code
CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code = public.generate_customer_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 8: set_yutong_order_no
CREATE OR REPLACE FUNCTION public.set_yutong_order_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
    NEW.order_no = public.generate_yutong_order_no();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 9: generate_yutong_warranty_number
CREATE OR REPLACE FUNCTION public.generate_yutong_warranty_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_warranty_seq');
  RETURN 'YTW-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 4, '0');
END;
$function$;

-- Function 10: generate_yutong_ticket_number
CREATE OR REPLACE FUNCTION public.generate_yutong_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_ticket_seq');
  RETURN 'YTT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 6, '0');
END;
$function$;

-- Function 11: set_yutong_warranty_number
CREATE OR REPLACE FUNCTION public.set_yutong_warranty_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.warranty_number IS NULL OR NEW.warranty_number = '' THEN
    NEW.warranty_number = public.generate_yutong_warranty_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 12: set_yutong_ticket_number
CREATE OR REPLACE FUNCTION public.set_yutong_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number = public.generate_yutong_ticket_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function 13: update_quotation_payment_totals
CREATE OR REPLACE FUNCTION public.update_quotation_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  UPDATE public.special_hire_quotations 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
      AND status = 'approved'
    ),
    advance_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id) 
      AND payment_type = 'advance'
      AND status = 'approved'
    ),
    balance_due = (
      (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + COALESCE(commission_pass_through_amount, 0) - COALESCE(discount_amount_lkr, 0)) - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.special_hire_payments 
        WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
        AND status = 'approved'
      )
    )
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function 14: generate_next_version_number
CREATE OR REPLACE FUNCTION public.generate_next_version_number(p_parent_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  latest_version TEXT;
  major_version INTEGER;
  minor_version INTEGER;
BEGIN
  SELECT version_number INTO latest_version
  FROM special_hire_quotations 
  WHERE (id = p_parent_id OR parent_quotation_id = p_parent_id)
  ORDER BY 
    CAST(split_part(version_number, '.', 1) AS INTEGER) DESC,
    CAST(split_part(version_number, '.', 2) AS INTEGER) DESC
  LIMIT 1;
  
  IF latest_version IS NULL THEN
    RETURN '1.0';
  END IF;
  
  major_version := CAST(split_part(latest_version, '.', 1) AS INTEGER);
  minor_version := CAST(split_part(latest_version, '.', 2) AS INTEGER);
  minor_version := minor_version + 1;
  
  RETURN major_version || '.' || minor_version;
END;
$function$;

-- ================================================
-- FIX 3: Create Rate Limiting Infrastructure
-- ================================================

-- Create table for tracking upload/submission rate limits
CREATE TABLE IF NOT EXISTS public.upload_rate_limits (
  ip_address text NOT NULL,
  form_type text NOT NULL,
  submission_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (ip_address, form_type)
);

-- Add RLS policies for rate limits table
ALTER TABLE public.upload_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits" 
ON public.upload_rate_limits
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create cleanup function to remove old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM public.upload_rate_limits 
  WHERE window_start < now() - interval '24 hours';
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.upload_rate_limits IS 
'Tracks submission rate limits for public forms to prevent spam and DOS attacks. Records are automatically cleaned up after 24 hours.';

COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS 
'Removes rate limit tracking records older than 24 hours. Should be called periodically via cron or edge function.';