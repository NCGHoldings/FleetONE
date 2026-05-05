-- Migration: Add Global Master Data Sharing for Customers and Vendors
-- This migration allows NCG Holdings to share customers and vendors across all sub-units.

-- 1. Add is_global flag to customers table
DO $$ 
BEGIN
    -- Only alter if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'is_global') THEN
            ALTER TABLE public.customers ADD COLUMN is_global BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- 2. Add is_global flag to vendors table (NOT suppliers)
DO $$ 
BEGIN
    -- Only alter if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'is_global') THEN
            ALTER TABLE public.vendors ADD COLUMN is_global BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- 3. Add indexing for faster querying on the new flag (with safe IF EXISTS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        CREATE INDEX IF NOT EXISTS idx_customers_is_global ON public.customers(is_global);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') THEN
        CREATE INDEX IF NOT EXISTS idx_vendors_is_global ON public.vendors(is_global);
    END IF;
END $$;

-- Output status
DO $$ BEGIN RAISE NOTICE 'Global Master Data sharing flags added successfully.'; END $$;
