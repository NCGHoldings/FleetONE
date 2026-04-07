-- Phase 2 Landed Cost Upgrades
-- Run this in your Supabase SQL Editor to add Enterprise Landed Cost features.

-- 1. Create the landed_cost_charges table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.landed_cost_charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id UUID REFERENCES public.landed_cost_vouchers(id) ON DELETE CASCADE,
    charge_type TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    currency_code TEXT DEFAULT 'LKR',
    exchange_rate DECIMAL(15, 6) DEFAULT 1.0,
    base_amount DECIMAL(15, 2),
    expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the landed_cost_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.landed_cost_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id UUID REFERENCES public.landed_cost_vouchers(id) ON DELETE CASCADE,
    item_id UUID,
    original_qty DECIMAL(15, 2),
    original_unit_cost DECIMAL(15, 2),
    allocated_cost DECIMAL(15, 2),
    new_unit_cost DECIMAL(15, 2),
    is_duty_exempt BOOLEAN DEFAULT false,
    manual_override_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Just in case they already existed but without the new columns, we try to add them
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_charges' AND column_name = 'supplier_id') THEN
        ALTER TABLE public.landed_cost_charges ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_charges' AND column_name = 'currency_code') THEN
        ALTER TABLE public.landed_cost_charges ADD COLUMN currency_code TEXT DEFAULT 'LKR';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_charges' AND column_name = 'exchange_rate') THEN
        ALTER TABLE public.landed_cost_charges ADD COLUMN exchange_rate DECIMAL(15, 6) DEFAULT 1.0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_charges' AND column_name = 'base_amount') THEN
        ALTER TABLE public.landed_cost_charges ADD COLUMN base_amount DECIMAL(15, 2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_charges' AND column_name = 'expense_account_id') THEN
        ALTER TABLE public.landed_cost_charges ADD COLUMN expense_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_items' AND column_name = 'is_duty_exempt') THEN
        ALTER TABLE public.landed_cost_items ADD COLUMN is_duty_exempt BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_items' AND column_name = 'manual_override_amount') THEN
        ALTER TABLE public.landed_cost_items ADD COLUMN manual_override_amount DECIMAL(15, 2);
    END IF;
END $$;
