-- Add missing columns to special_hire_quotations table for status management
ALTER TABLE public.special_hire_quotations 
ADD COLUMN IF NOT EXISTS status_change_reason text,
ADD COLUMN IF NOT EXISTS status_changed_by uuid,
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status text,
ADD COLUMN IF NOT EXISTS refund_reason text;