-- Create school_payments table for tracking individual student payments
CREATE TABLE IF NOT EXISTS public.school_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'verified',
  verified_by UUID,
  receipt_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_reminders table for tracking reminder notifications
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'overdue',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_method TEXT,
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on school_payments (only if it doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'school_payments' AND relrowsecurity
  ) THEN
    ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on payment_reminders (only if it doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'payment_reminders' AND relrowsecurity
  ) THEN
    ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies for school_payments (drop and recreate if exists)
DROP POLICY IF EXISTS "All authenticated users can view school payments" ON public.school_payments;
CREATE POLICY "All authenticated users can view school payments"
ON public.school_payments FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can manage school payments" ON public.school_payments;
CREATE POLICY "Staff can manage school payments"
ON public.school_payments FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- Create RLS policies for payment_reminders (drop and recreate if exists)
DROP POLICY IF EXISTS "All authenticated users can view payment reminders" ON public.payment_reminders;
CREATE POLICY "All authenticated users can view payment reminders"
ON public.payment_reminders FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can manage payment reminders" ON public.payment_reminders;
CREATE POLICY "Staff can manage payment reminders"
ON public.payment_reminders FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_payments_student_id ON school_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_school_payments_branch_id ON school_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_school_payments_payment_date ON school_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_school_payments_status ON school_payments(status);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_student_id ON payment_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at);

-- Add updated_at trigger for school_payments (drop and recreate if exists)
DROP TRIGGER IF EXISTS update_school_payments_updated_at ON public.school_payments;
CREATE TRIGGER update_school_payments_updated_at
  BEFORE UPDATE ON public.school_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();