-- Add payment tracking columns to special_hire_quotations table
ALTER TABLE public.special_hire_quotations 
ADD COLUMN IF NOT EXISTS advance_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;

-- Add trip assignment columns for tracking driver, conductor, and bus
ALTER TABLE public.special_hire_quotations
ADD COLUMN IF NOT EXISTS assigned_driver_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_conductor_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_bus_no TEXT;

-- Enable real-time replication for the tables
ALTER TABLE public.special_hire_quotations REPLICA IDENTITY FULL;
ALTER TABLE public.special_hire_payments REPLICA IDENTITY FULL;  
ALTER TABLE public.special_hire_invoices REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_hire_quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_hire_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_hire_invoices;

-- Create function to calculate and update payment totals
CREATE OR REPLACE FUNCTION public.update_quotation_payment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the quotation's payment totals when payments are inserted/updated/deleted
  UPDATE public.special_hire_quotations 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
    ),
    advance_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id) 
      AND payment_type = 'advance'
    ),
    balance_due = (
      -- Calculate balance: gross_revenue + fuel + commission - discount - total_paid
      (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + COALESCE(commission_pass_through_amount, 0) - COALESCE(discount_amount_lkr, 0)) - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.special_hire_payments 
        WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
      )
    )
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update payment totals
DROP TRIGGER IF EXISTS trigger_update_quotation_totals_on_payment_insert ON public.special_hire_payments;
DROP TRIGGER IF EXISTS trigger_update_quotation_totals_on_payment_update ON public.special_hire_payments;
DROP TRIGGER IF EXISTS trigger_update_quotation_totals_on_payment_delete ON public.special_hire_payments;

CREATE TRIGGER trigger_update_quotation_totals_on_payment_insert
  AFTER INSERT ON public.special_hire_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_quotation_payment_totals();

CREATE TRIGGER trigger_update_quotation_totals_on_payment_update
  AFTER UPDATE ON public.special_hire_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_quotation_payment_totals();

CREATE TRIGGER trigger_update_quotation_totals_on_payment_delete
  AFTER DELETE ON public.special_hire_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_quotation_payment_totals();