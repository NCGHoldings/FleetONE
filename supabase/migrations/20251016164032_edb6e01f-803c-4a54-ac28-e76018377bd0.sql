-- ================================================
-- COMPREHENSIVE SECURITY FIXES - PHASE 3 (FINAL)
-- Fix final batch of SECURITY DEFINER functions missing search_path
-- ================================================

-- Non-SECURITY DEFINER functions (trigger functions)
-- These don't use SECURITY DEFINER so search_path is less critical, but adding for consistency

-- Function: update_feedback_escalation_timestamp
CREATE OR REPLACE FUNCTION public.update_feedback_escalation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
BEGIN
  IF NEW.escalation_level != OLD.escalation_level THEN
    NEW.escalated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: update_trip_status_timestamp
CREATE OR REPLACE FUNCTION public.update_trip_status_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
BEGIN
  IF NEW.trip_status != OLD.trip_status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: calculate_nsp_total_sale
CREATE OR REPLACE FUNCTION public.calculate_nsp_total_sale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
DECLARE
  other_income_total NUMERIC := 0;
  item JSONB;
BEGIN
  IF NEW.other_income IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.other_income)
    LOOP
      other_income_total := other_income_total + COALESCE((item->>'amount')::numeric, 0);
    END LOOP;
  END IF;
  
  NEW.total_sale := COALESCE(NEW.lss_outside_sale, 0) + 
                    COALESCE(NEW.lss_inside_sale, 0) + 
                    COALESCE(NEW.tyre_sale, 0) + 
                    COALESCE(NEW.pepiliyana_sale, 0) + 
                    other_income_total;
  
  RETURN NEW;
END;
$function$;

-- Function: update_yutong_order_financials
CREATE OR REPLACE FUNCTION public.update_yutong_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
BEGIN
  UPDATE public.yutong_orders 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.yutong_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status = 'received'
    ),
    balance_due = total_amount - (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM public.yutong_customer_payments 
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND status = 'received'
    )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function: calculate_income_from_details (immutable function - search_path not applicable)
-- No changes needed - immutable functions don't need search_path

-- Function: calculate_expenses_from_details (immutable function - search_path not applicable)
-- No changes needed - immutable functions don't need search_path

-- Function: update_trip_totals
CREATE OR REPLACE FUNCTION public.update_trip_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
BEGIN
  IF NEW.income_details IS NOT NULL THEN
    NEW.income := calculate_income_from_details(NEW.income_details);
  END IF;
  
  IF NEW.other_expenses_details IS NOT NULL THEN
    NEW.other_expenses := calculate_expenses_from_details(NEW.other_expenses_details);
  END IF;
  
  NEW.total_expenses := COALESCE(NEW.fuel_cost, 0) + COALESCE(NEW.other_expenses, 0);
  NEW.net_income := COALESCE(NEW.income, 0) - COALESCE(NEW.total_expenses, 0);
  
  RETURN NEW;
END;
$function$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: recalculate_quotation_totals_on_status_change
CREATE OR REPLACE FUNCTION public.recalculate_quotation_totals_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public  -- Added for consistency
AS $function$
BEGIN
  IF OLD.trip_status != NEW.trip_status THEN
    NEW.balance_due := (
      (NEW.gross_revenue + COALESCE(NEW.fuel_cost_fuel_only, 0) + COALESCE(NEW.commission_pass_through_amount, 0) + COALESCE(NEW.total_additional_charges, 0) - COALESCE(NEW.discount_amount_lkr, 0)) - COALESCE(NEW.total_paid, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Critical SECURITY DEFINER functions (these ARE security sensitive)

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public  -- CRITICAL SECURITY FIX
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Function: get_user_roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public  -- CRITICAL SECURITY FIX
AS $function$
  SELECT ARRAY_AGG(role) 
  FROM public.user_roles 
  WHERE user_id = _user_id
$function$;

-- Function: has_page_access
CREATE OR REPLACE FUNCTION public.has_page_access(_user_id uuid, _page_identifier text)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public  -- CRITICAL SECURITY FIX
AS $function$
  SELECT COALESCE(
    (SELECT has_access FROM user_page_permissions WHERE user_id = _user_id AND page_identifier = _page_identifier),
    false
  )
$function$;

-- Function: get_user_page_permissions
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(_user_id uuid)
RETURNS TABLE(page_identifier text, has_access boolean)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public  -- CRITICAL SECURITY FIX
AS $function$
  SELECT 
    page_identifier,
    has_access
  FROM public.user_page_permissions 
  WHERE user_id = _user_id
$function$;

-- Function: create_admin_user
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- CRITICAL SECURITY FIX
AS $function$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@test.com';
  
  IF admin_user_id IS NULL THEN
    CREATE TEMP TABLE IF NOT EXISTS pending_admin_setup (
      email text PRIMARY KEY,
      should_be_admin boolean DEFAULT true
    );
    
    INSERT INTO pending_admin_setup (email) 
    VALUES ('admin@test.com')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 
'SECURITY DEFINER function to check user roles. Fixed search_path prevents SQL injection.';

COMMENT ON FUNCTION public.get_user_roles(uuid) IS 
'SECURITY DEFINER function to get all user roles. Fixed search_path prevents SQL injection.';

COMMENT ON FUNCTION public.has_page_access(uuid, text) IS 
'SECURITY DEFINER function to check page access permissions. Fixed search_path prevents SQL injection.';

COMMENT ON FUNCTION public.get_user_page_permissions(uuid) IS 
'SECURITY DEFINER function to get all page permissions for a user. Fixed search_path prevents SQL injection.';