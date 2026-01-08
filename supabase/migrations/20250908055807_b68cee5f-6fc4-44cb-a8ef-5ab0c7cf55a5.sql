-- Create comprehensive function to handle trip status changes with financial adjustments
CREATE OR REPLACE FUNCTION public.update_trip_status_with_adjustments(
  p_quotation_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL,
  p_refund_amount numeric DEFAULT NULL,
  p_refund_status text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_quotation record;
  new_totals record;
  audit_entry jsonb;
  result jsonb;
BEGIN
  -- Get current quotation data
  SELECT * INTO old_quotation 
  FROM public.special_hire_quotations 
  WHERE id = p_quotation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
  END IF;
  
  -- Create audit entry for the status change
  audit_entry := jsonb_build_object(
    'timestamp', now(),
    'changed_by', p_changed_by,
    'old_status', old_quotation.trip_status,
    'new_status', p_new_status,
    'reason', p_reason,
    'refund_amount', p_refund_amount,
    'refund_status', p_refund_status
  );
  
  -- Start with basic status update
  UPDATE public.special_hire_quotations
  SET 
    trip_status = p_new_status,
    status_changed_at = now(),
    status_changed_by = p_changed_by,
    status_change_reason = p_reason,
    audit_log = COALESCE(audit_log, '[]'::jsonb) || audit_entry,
    updated_at = now()
  WHERE id = p_quotation_id;
  
  -- Handle refund processing for cancellations
  IF p_new_status = 'cancelled' AND p_refund_amount IS NOT NULL AND p_refund_amount > 0 THEN
    -- Update quotation with refund details
    UPDATE public.special_hire_quotations
    SET 
      refund_amount = p_refund_amount,
      refund_status = p_refund_status,
      refund_reason = p_reason,
      -- Adjust financial totals
      total_paid = GREATEST(0, COALESCE(total_paid, 0) - p_refund_amount),
      advance_paid = GREATEST(0, COALESCE(advance_paid, 0) - LEAST(p_refund_amount, COALESCE(advance_paid, 0)))
    WHERE id = p_quotation_id;
    
    -- Update balance_due calculation
    UPDATE public.special_hire_quotations
    SET balance_due = (
      (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + COALESCE(commission_pass_through_amount, 0) + COALESCE(total_additional_charges, 0) - COALESCE(discount_amount_lkr, 0)) - COALESCE(total_paid, 0)
    )
    WHERE id = p_quotation_id;
    
    -- Mark related payments as refunded if they match the refund amount
    UPDATE public.special_hire_payments
    SET 
      status = 'refunded',
      notes = COALESCE(notes, '') || ' [REFUNDED DUE TO TRIP CANCELLATION]',
      updated_at = now()
    WHERE quotation_id = p_quotation_id 
      AND status = 'approved'
      AND amount <= p_refund_amount;
    
    -- Update document statuses to cancelled
    UPDATE public.document_storage
    SET 
      document_status = 'cancelled',
      updated_at = now()
    WHERE quotation_id = p_quotation_id 
      AND document_status IN ('draft', 'approved');
      
    -- Create refund notification
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
  
  -- Handle completion status - mark all payments as final
  IF p_new_status = 'completed' THEN
    UPDATE public.special_hire_payments
    SET status = 'approved'
    WHERE quotation_id = p_quotation_id 
      AND status IN ('pending_operations', 'pending_finance');
  END IF;
  
  -- Get updated totals for response
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
  
  -- Return success response with updated data
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
$$;

-- Create trigger to automatically recalculate totals when trip status changes
CREATE OR REPLACE FUNCTION public.recalculate_quotation_totals_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only recalculate if trip_status actually changed
  IF OLD.trip_status != NEW.trip_status THEN
    -- Recalculate balance_due to ensure accuracy
    NEW.balance_due := (
      (NEW.gross_revenue + COALESCE(NEW.fuel_cost_fuel_only, 0) + COALESCE(NEW.commission_pass_through_amount, 0) + COALESCE(NEW.total_additional_charges, 0) - COALESCE(NEW.discount_amount_lkr, 0)) - COALESCE(NEW.total_paid, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_recalculate_totals_on_status_change ON public.special_hire_quotations;
CREATE TRIGGER trigger_recalculate_totals_on_status_change
  BEFORE UPDATE ON public.special_hire_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_quotation_totals_on_status_change();