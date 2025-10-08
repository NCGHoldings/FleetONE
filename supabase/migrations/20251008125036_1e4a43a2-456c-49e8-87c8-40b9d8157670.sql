-- Add new payment tracking columns to school_students
ALTER TABLE public.school_students 
ADD COLUMN fixed_monthly_amount NUMERIC,
ADD COLUMN payment_balance NUMERIC DEFAULT 0,
ADD COLUMN current_amount_due NUMERIC;

-- Migrate existing data: copy update_new to fixed_monthly_amount
UPDATE public.school_students 
SET fixed_monthly_amount = update_new,
    payment_balance = 0,
    current_amount_due = update_new
WHERE update_new IS NOT NULL;

-- Create school_payment_transactions table for detailed payment history
CREATE TABLE public.school_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.school_students(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  fixed_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL,
  difference NUMERIC NOT NULL,
  payment_balance_before NUMERIC NOT NULL,
  payment_balance_after NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference_no TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on school_payment_transactions
ALTER TABLE public.school_payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_payment_transactions
CREATE POLICY "All authenticated users can view payment transactions"
  ON public.school_payment_transactions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage payment transactions"
  ON public.school_payment_transactions
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'supervisor')
  );

-- Function to automatically update student balance after payment insertion
CREATE OR REPLACE FUNCTION public.update_student_payment_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the student's payment balance and current amount due
  UPDATE public.school_students
  SET 
    payment_balance = NEW.payment_balance_after,
    current_amount_due = fixed_monthly_amount - NEW.payment_balance_after,
    payment_amount = NEW.amount_paid,
    last_payment_date = NEW.payment_date,
    payment_status = CASE
      WHEN NEW.payment_balance_after >= 0 THEN 'paid'
      WHEN NEW.payment_balance_after < 0 AND NEW.payment_balance_after > -fixed_monthly_amount THEN 'pending'
      ELSE 'overdue'
    END,
    updated_at = now()
  WHERE id = NEW.student_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update student balance automatically
CREATE TRIGGER update_balance_after_payment
  AFTER INSERT ON public.school_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_payment_balance();

-- Add trigger for updated_at
CREATE TRIGGER update_school_payment_transactions_updated_at
  BEFORE UPDATE ON public.school_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payment_transactions_student_id ON public.school_payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_payment_date ON public.school_payment_transactions(payment_date DESC);