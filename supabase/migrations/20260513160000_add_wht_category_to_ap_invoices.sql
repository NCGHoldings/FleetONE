-- Add WHT Category column to AP Invoices
-- This allows explicit categorization for IRD WHT reporting sections
-- Categories: rent, service_fee, vehicle_rent, interest, commission, other, non_liable

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ap_invoices'
      AND column_name = 'wht_category'
  ) THEN
    ALTER TABLE public.ap_invoices
      ADD COLUMN wht_category TEXT DEFAULT NULL;
    
    COMMENT ON COLUMN public.ap_invoices.wht_category IS
      'WHT payment category for IRD reporting. Values: rent, service_fee, vehicle_rent, interest, commission, other, non_liable. NULL means auto-detect from vendor.';
  END IF;
END $$;
