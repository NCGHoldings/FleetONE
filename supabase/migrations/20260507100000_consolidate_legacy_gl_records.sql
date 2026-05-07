-- Migration: Consolidate Legacy GL Records
-- Date: 2026-05-07
-- Objective: Backfill business_unit_code and company_id for historical consistency across consolidated GL.

DO $$
DECLARE
    v_default_company_id UUID;
    v_sbo_company_id UUID;
    v_yut_company_id UUID;
BEGIN
    -- 1. Identify primary company and unit-specific companies if they exist
    -- Assuming 'NCG Holding' or similar as primary. Fallback to any company.
    SELECT id INTO v_default_company_id FROM public.companies ORDER BY created_at LIMIT 1;
    
    -- Attempt to find unit-specific companies if they are partitioned by name
    SELECT id INTO v_sbo_company_id FROM public.companies WHERE name ILIKE '%School Bus%' OR name ILIKE '%SBO%' LIMIT 1;
    SELECT id INTO v_yut_company_id FROM public.companies WHERE name ILIKE '%Yutong%' OR name ILIKE '%YUT%' LIMIT 1;

    -- 2. Backfill journal_entries
    -- Default to HQ but allow inference from entry_number or description
    UPDATE public.journal_entries
    SET 
        company_id = COALESCE(company_id, v_default_company_id),
        business_unit_code = COALESCE(business_unit_code, 
            CASE 
                WHEN entry_number ILIKE 'SBS-%' OR description ILIKE '%School Bus%' THEN 'SBO'
                WHEN entry_number ILIKE 'YUT-%' OR description ILIKE '%Yutong%' THEN 'YUT'
                WHEN entry_number ILIKE 'SPH-%' OR description ILIKE '%Special Hire%' THEN 'SPH'
                WHEN entry_number ILIKE 'LTV-%' OR description ILIKE '%Light Vehicle%' THEN 'LTV'
                WHEN entry_number ILIKE 'SNT-%' OR description ILIKE '%Sinotruck%' THEN 'SNT'
                ELSE 'HQ'
            END
        )
    WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';

    -- 3. Backfill journal_entry_lines
    -- Sync with parent journal_entry
    UPDATE public.journal_entry_lines jel
    SET 
        company_id = je.company_id,
        business_unit_code = je.business_unit_code
    FROM public.journal_entries je
    WHERE jel.journal_entry_id = je.id
      AND (jel.company_id IS NULL OR jel.business_unit_code IS NULL OR jel.business_unit_code = '');

    -- 4. Backfill ar_invoices
    UPDATE public.ar_invoices
    SET 
        company_id = COALESCE(company_id, CASE WHEN business_unit_code = 'SBO' THEN v_sbo_company_id ELSE v_default_company_id END, v_default_company_id),
        business_unit_code = COALESCE(business_unit_code, 
            CASE 
                WHEN invoice_number ILIKE 'SBS-%' THEN 'SBO'
                WHEN invoice_number ILIKE 'YUT-%' THEN 'YUT'
                ELSE 'HQ'
            END
        )
    WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';

    -- 5. Backfill ap_invoices
    UPDATE public.ap_invoices
    SET 
        company_id = COALESCE(company_id, v_default_company_id),
        business_unit_code = COALESCE(business_unit_code, 'HQ')
    WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';

    -- 6. Backfill ar_receipts
    UPDATE public.ar_receipts
    SET 
        company_id = COALESCE(company_id, v_default_company_id),
        business_unit_code = COALESCE(business_unit_code, 'HQ')
    WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';

    -- 7. Backfill ap_payments
    UPDATE public.ap_payments
    SET 
        company_id = COALESCE(company_id, v_default_company_id),
        business_unit_code = COALESCE(business_unit_code, 'HQ')
    WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';

    -- 8. Backfill landed_cost_vouchers (if table exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'landed_cost_vouchers') THEN
        UPDATE public.landed_cost_vouchers
        SET 
            company_id = COALESCE(company_id, v_default_company_id),
            business_unit_code = COALESCE(business_unit_code, 'HQ')
        WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';
    END IF;

    -- 9. Backfill intercompany_reconciliations (if table exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intercompany_reconciliations') THEN
        UPDATE public.intercompany_reconciliations
        SET 
            company_id = COALESCE(company_id, v_default_company_id),
            business_unit_code = COALESCE(business_unit_code, 'HQ')
        WHERE company_id IS NULL OR business_unit_code IS NULL OR business_unit_code = '';
    END IF;

    RAISE NOTICE 'GL Consolidation Migration Completed Successfully.';
END $$;
