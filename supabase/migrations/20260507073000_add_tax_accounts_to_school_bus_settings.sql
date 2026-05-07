-- Add VAT and WHT account fields to school_bus_finance_settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_bus_finance_settings' AND column_name = 'vat_output_account_id') THEN
        ALTER TABLE school_bus_finance_settings ADD COLUMN vat_output_account_id UUID REFERENCES chart_of_accounts(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_bus_finance_settings' AND column_name = 'wht_payable_account_id') THEN
        ALTER TABLE school_bus_finance_settings ADD COLUMN wht_payable_account_id UUID REFERENCES chart_of_accounts(id);
    END IF;
END $$;
