-- Add missing columns to lightvehicle_payment_schedules for full payment tracking
-- These columns are required by the order creation code and provide parity with Yutong/Sinotruck

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS milestone_name TEXT NOT NULL DEFAULT 'Payment';

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 1;

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE public.lightvehicle_payment_schedules 
ADD COLUMN IF NOT EXISTS payment_method TEXT;