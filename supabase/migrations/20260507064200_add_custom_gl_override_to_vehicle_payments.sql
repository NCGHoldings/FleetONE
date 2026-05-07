-- Add custom_credit_account_id to vehicle payment tables for granular GL control
DO $$ 
BEGIN
    -- Yutong
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yutong_customer_payments' AND column_name = 'custom_credit_account_id') THEN
        ALTER TABLE public.yutong_customer_payments ADD COLUMN custom_credit_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;

    -- Sinotruk (spelled as sinotruck in DB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sinotruck_customer_payments' AND column_name = 'custom_credit_account_id') THEN
        ALTER TABLE public.sinotruck_customer_payments ADD COLUMN custom_credit_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;

    -- Light Vehicle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lightvehicle_customer_payments' AND column_name = 'custom_credit_account_id') THEN
        ALTER TABLE public.lightvehicle_customer_payments ADD COLUMN custom_credit_account_id UUID REFERENCES public.chart_of_accounts(id);
    END IF;
END $$;
