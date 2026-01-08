-- Add finance role to app_role enum
ALTER TYPE app_role ADD VALUE 'finance';

-- Add payment status tracking
CREATE TYPE payment_status AS ENUM ('pending_operations', 'pending_finance', 'approved', 'rejected');

-- Add payment status to special_hire_payments table
ALTER TABLE special_hire_payments 
ADD COLUMN status payment_status DEFAULT 'pending_operations',
ADD COLUMN finance_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN finance_approved_at timestamp with time zone,
ADD COLUMN payment_proof_url text,
ADD COLUMN notes text;

-- Add invoice status tracking
ALTER TABLE special_hire_invoices 
ADD COLUMN status text DEFAULT 'draft',
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamp with time zone;

-- Create payment approval notifications table
CREATE TABLE IF NOT EXISTS payment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES special_hire_payments(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES special_hire_quotations(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'finance_approval_required', 'payment_approved'
  target_role app_role NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on notifications
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view notifications for their role"
ON payment_notifications
FOR SELECT
USING (
  target_role = ANY(get_user_roles(auth.uid()))
);

CREATE POLICY "Staff can create notifications"
ON payment_notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- Update payment totals trigger to handle new status field
CREATE OR REPLACE FUNCTION public.update_quotation_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only count approved payments in totals
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
      -- Calculate balance: gross_revenue + fuel + commission - discount - total_paid (approved only)
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

-- Create function to check page permissions
CREATE OR REPLACE FUNCTION public.has_page_access(_user_id uuid, _page_identifier text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT has_access FROM user_page_permissions WHERE user_id = _user_id AND page_identifier = _page_identifier),
    false
  )
$$;