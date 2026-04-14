-- ================================================
-- COMPREHENSIVE SECURITY FIXES - PHASE 2
-- Fix remaining SECURITY DEFINER functions missing search_path
-- ================================================

-- Function: update_trip_status_with_adjustments
CREATE OR REPLACE FUNCTION public.update_trip_status_with_adjustments(p_quotation_id uuid, p_new_status text, p_reason text DEFAULT NULL::text, p_refund_amount numeric DEFAULT NULL::numeric, p_refund_status text DEFAULT NULL::text, p_changed_by uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  old_quotation record;
  new_totals record;
  audit_entry jsonb;
  result jsonb;
BEGIN
  SELECT * INTO old_quotation 
  FROM public.special_hire_quotations 
  WHERE id = p_quotation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
  END IF;
  
  audit_entry := jsonb_build_object(
    'timestamp', now(),
    'changed_by', p_changed_by,
    'old_status', old_quotation.trip_status,
    'new_status', p_new_status,
    'reason', p_reason,
    'refund_amount', p_refund_amount,
    'refund_status', p_refund_status
  );
  
  UPDATE public.special_hire_quotations
  SET 
    trip_status = p_new_status,
    status_changed_at = now(),
    status_changed_by = p_changed_by,
    status_change_reason = p_reason,
    audit_log = COALESCE(audit_log, '[]'::jsonb) || audit_entry,
    updated_at = now()
  WHERE id = p_quotation_id;
  
  IF p_new_status = 'cancelled' AND p_refund_amount IS NOT NULL AND p_refund_amount > 0 THEN
    UPDATE public.special_hire_quotations
    SET 
      refund_amount = p_refund_amount,
      refund_status = p_refund_status,
      refund_reason = p_reason,
      total_paid = GREATEST(0, COALESCE(total_paid, 0) - p_refund_amount),
      advance_paid = GREATEST(0, COALESCE(advance_paid, 0) - LEAST(p_refund_amount, COALESCE(advance_paid, 0)))
    WHERE id = p_quotation_id;
    
    UPDATE public.special_hire_quotations
    SET balance_due = (
      (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + COALESCE(commission_pass_through_amount, 0) + COALESCE(total_additional_charges, 0) - COALESCE(discount_amount_lkr, 0)) - COALESCE(total_paid, 0)
    )
    WHERE id = p_quotation_id;
    
    UPDATE public.special_hire_payments
    SET 
      status = 'refunded',
      notes = COALESCE(notes, '') || ' [REFUNDED DUE TO TRIP CANCELLATION]',
      updated_at = now()
    WHERE quotation_id = p_quotation_id 
      AND status = 'approved'
      AND amount <= p_refund_amount;
    
    UPDATE public.document_storage
    SET 
      document_status = 'cancelled',
      updated_at = now()
    WHERE quotation_id = p_quotation_id 
      AND document_status IN ('draft', 'approved');
      
    INSERT INTO public.payment_notifications (
      quotation_id, 
      payment_id, 
      notification_type, 
      message, 
      target_role,
      created_by
    )
    SELECT 
      p_quotation_id,
      p.id,
      'refund_processed',
      'Trip cancelled with refund of LKR ' || p_refund_amount || '. Reason: ' || COALESCE(p_reason, 'Not specified'),
      'finance',
      p_changed_by
    FROM public.special_hire_payments p
    WHERE p.quotation_id = p_quotation_id 
      AND p.status = 'refunded'
    LIMIT 1;
  END IF;
  
  IF p_new_status = 'completed' THEN
    UPDATE public.special_hire_payments
    SET status = 'approved'
    WHERE quotation_id = p_quotation_id 
      AND status IN ('pending_operations', 'pending_finance');
  END IF;
  
  SELECT 
    total_paid,
    advance_paid, 
    balance_due,
    trip_status,
    refund_amount,
    refund_status
  INTO new_totals
  FROM public.special_hire_quotations
  WHERE id = p_quotation_id;
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Trip status updated successfully',
    'old_status', old_quotation.trip_status,
    'new_status', p_new_status,
    'financial_impact', jsonb_build_object(
      'old_total_paid', old_quotation.total_paid,
      'new_total_paid', new_totals.total_paid,
      'old_advance_paid', old_quotation.advance_paid,
      'new_advance_paid', new_totals.advance_paid,
      'old_balance_due', old_quotation.balance_due,
      'new_balance_due', new_totals.balance_due,
      'refund_amount', new_totals.refund_amount
    )
  );
  
  RETURN result;
  
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Failed to update trip status: ' || SQLERRM
  );
END;
$function$;

-- Function: generate_next_yutong_version_number
CREATE OR REPLACE FUNCTION public.generate_next_yutong_version_number(p_parent_id uuid)
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
  FROM yutong_quotations 
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

-- Function: set_initial_quotation_version
CREATE OR REPLACE FUNCTION public.set_initial_quotation_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.version_number IS NULL OR NEW.version_number = '' THEN
      NEW.version_number = '1.0';
    END IF;
    
    IF NEW.quotation_no IS NOT NULL AND NEW.quotation_no != '' AND NEW.quotation_no NOT LIKE '%-v%' THEN
      NEW.quotation_no = NEW.quotation_no || '-v1.0';
    END IF;
    
    IF NEW.is_active_version IS NULL THEN
      NEW.is_active_version = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function: audit_accident_changes
CREATE OR REPLACE FUNCTION public.audit_accident_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, new_value, action)
    VALUES (NEW.id, auth.uid(), 'record_created', 'Record created', 'INSERT');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vehicle_number != NEW.vehicle_number THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'vehicle_number', OLD.vehicle_number, NEW.vehicle_number, 'UPDATE');
    END IF;
    IF OLD.accident_date != NEW.accident_date THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'accident_date', OLD.accident_date::text, NEW.accident_date::text, 'UPDATE');
    END IF;
    IF OLD.status != NEW.status THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status, 'UPDATE');
    END IF;
    IF OLD.estimate_amount != NEW.estimate_amount OR (OLD.estimate_amount IS NULL) != (NEW.estimate_amount IS NULL) THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'estimate_amount', OLD.estimate_amount::text, NEW.estimate_amount::text, 'UPDATE');
    END IF;
    IF OLD.approved_amount != NEW.approved_amount OR (OLD.approved_amount IS NULL) != (NEW.approved_amount IS NULL) THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'approved_amount', OLD.approved_amount::text, NEW.approved_amount::text, 'UPDATE');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, action)
    VALUES (OLD.id, auth.uid(), 'record_deleted', 'Record deleted', 'DELETE');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Function: set_yutong_quotation_details
CREATE OR REPLACE FUNCTION public.set_yutong_quotation_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quotation_no IS NULL OR NEW.quotation_no = '' THEN
      NEW.quotation_no = public.generate_yutong_quotation_no(COALESCE(NEW.created_at::DATE, CURRENT_DATE));
    END IF;
    
    IF NEW.parent_quotation_id IS NULL THEN
      IF NEW.version_number IS NULL OR NEW.version_number = '' THEN
        NEW.version_number = '1.0';
      END IF;
      
      IF NEW.quotation_no NOT LIKE '%-v%' THEN
        NEW.quotation_no = NEW.quotation_no || '-v1.0';
      END IF;
    END IF;
    
    IF NEW.is_active_version IS NULL THEN
      NEW.is_active_version = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function: update_student_payment_balance
CREATE OR REPLACE FUNCTION public.update_student_payment_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  UPDATE public.school_students
  SET 
    payment_balance = NEW.payment_balance_after,
    current_amount_due = GREATEST(0, fixed_monthly_amount - NEW.payment_balance_after),
    payment_amount = NEW.amount_paid,
    last_payment_date = NEW.payment_date,
    payment_status = CASE
      WHEN NEW.payment_balance_after >= fixed_monthly_amount THEN 'paid'
      WHEN NEW.payment_balance_after > 0 THEN 'pending'
      ELSE 'overdue'
    END,
    updated_at = now()
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$function$;

-- Function: set_feedback_sla_due_date
CREATE OR REPLACE FUNCTION public.set_feedback_sla_due_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.sla_due_date IS NULL THEN
    NEW.sla_due_date := public.calculate_sla_due_date(NEW.created_at, 48);
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: calculate_sla_due_date
CREATE OR REPLACE FUNCTION public.calculate_sla_due_date(p_start_date timestamp with time zone, p_business_hours numeric DEFAULT 48)
RETURNS timestamp with time zone
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  v_current_date date;
  v_days_to_add numeric;
  v_days_added integer := 0;
  v_result timestamp with time zone;
BEGIN
  v_days_to_add := CEIL(p_business_hours / 24.0);
  v_current_date := p_start_date::date;
  v_result := p_start_date;
  
  WHILE v_days_added < v_days_to_add LOOP
    v_current_date := v_current_date + interval '1 day';
    
    IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE holiday_date = v_current_date
      ) THEN
        v_days_added := v_days_added + 1;
        v_result := v_current_date::timestamp with time zone + (p_start_date::time);
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_result;
END;
$function$;

-- Function: deactivate_old_yutong_quotation_versions
CREATE OR REPLACE FUNCTION public.deactivate_old_yutong_quotation_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF NEW.is_active_version = true THEN
    UPDATE yutong_quotations
    SET is_active_version = false
    WHERE id != NEW.id
    AND COALESCE(parent_quotation_id, id) = COALESCE(NEW.parent_quotation_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
DECLARE
  is_first_user BOOLEAN;
  should_be_admin BOOLEAN DEFAULT FALSE;
  emp_id TEXT;
BEGIN
  SELECT COUNT(*) = 0 FROM public.profiles INTO is_first_user;
  
  IF NEW.email = 'admin@test.com' THEN
    should_be_admin := TRUE;
  END IF;

  IF is_first_user OR should_be_admin THEN
    emp_id := 'ADMIN001';
  ELSE
    emp_id := NULL;
  END IF;
  
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name, 
    employee_id,
    hire_date,
    status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    emp_id,
    CURRENT_DATE,
    'active'::user_status
  );
  
  IF is_first_user OR should_be_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function: update_agent_referral_stats
CREATE OR REPLACE FUNCTION public.update_agent_referral_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.referral_agent_id IS NOT NULL THEN
    UPDATE public.referral_agents
    SET 
      total_referrals = total_referrals + 1,
      total_commission_earned = total_commission_earned + COALESCE(NEW.referral_commission_amount, 0),
      updated_at = now()
    WHERE id = NEW.referral_agent_id;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.referral_agent_id IS NOT NULL AND OLD.referral_agent_id != COALESCE(NEW.referral_agent_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      UPDATE public.referral_agents
      SET 
        total_referrals = GREATEST(0, total_referrals - 1),
        total_commission_earned = GREATEST(0, total_commission_earned - COALESCE(OLD.referral_commission_amount, 0)),
        updated_at = now()
      WHERE id = OLD.referral_agent_id;
    END IF;
    
    IF NEW.referral_agent_id IS NOT NULL AND (OLD.referral_agent_id IS NULL OR OLD.referral_agent_id != NEW.referral_agent_id) THEN
      UPDATE public.referral_agents
      SET 
        total_referrals = total_referrals + 1,
        total_commission_earned = total_commission_earned + COALESCE(NEW.referral_commission_amount, 0),
        updated_at = now()
      WHERE id = NEW.referral_agent_id;
    END IF;
    
    IF NEW.referral_agent_id IS NOT NULL AND OLD.referral_agent_id = NEW.referral_agent_id AND OLD.referral_commission_amount != NEW.referral_commission_amount THEN
      UPDATE public.referral_agents
      SET 
        total_commission_earned = total_commission_earned - COALESCE(OLD.referral_commission_amount, 0) + COALESCE(NEW.referral_commission_amount, 0),
        updated_at = now()
      WHERE id = NEW.referral_agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;