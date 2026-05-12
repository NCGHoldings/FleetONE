-- ============================================
-- Fix sinotruck_payment_schedules schema
-- Align with yutong_payment_schedules columns
-- ============================================
-- Root cause: Two conflicting CREATE TABLE IF NOT EXISTS migrations.
-- The later migration (20260125) created a simplified version missing
-- payment_type, status, sequence_order, is_lc_payment etc.
-- This migration adds ALL missing columns safely with IF NOT EXISTS.

ALTER TABLE public.sinotruck_payment_schedules
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'advance',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_lc_payment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- Create indexes for the new columns (match Yutong pattern)
CREATE INDEX IF NOT EXISTS idx_sinotruck_payment_schedules_status 
  ON public.sinotruck_payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_sinotruck_payment_schedules_due_date 
  ON public.sinotruck_payment_schedules(due_date);
