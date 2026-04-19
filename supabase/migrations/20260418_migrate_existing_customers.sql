-- 20260418_migrate_existing_customers.sql
-- Description: Migrates existing legacy Yutong and Sinotruck customers to the new unified Customers table for the NCG Holdings Accounting ledger, handling duplicates elegantly via DO blocks.

DO $$
DECLARE
    y_cust RECORD;
    s_cust RECORD;
    new_cust_id UUID;
BEGIN
    -- 1. Migrate Yutong Customers
    FOR y_cust IN SELECT * FROM yutong_customers WHERE accounting_customer_id IS NULL AND is_active = true
    LOOP
        BEGIN
            -- Attempt insert to central customers table
            INSERT INTO public.customers (
                company_id,
                customer_name,
                phone,
                email,
                billing_address,
                customer_type,
                tax_id,
                business_registration_no,
                source_module,
                source_record_id,
                created_at,
                updated_at
            ) VALUES (
                (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1),
                y_cust.company_name,
                y_cust.phone,
                y_cust.email,
                y_cust.address,
                COALESCE(y_cust.customer_type, 'business'),
                y_cust.tax_number,
                y_cust.business_registration_no,
                'yutong',
                y_cust.id,
                y_cust.created_at,
                y_cust.updated_at
            )
            RETURNING id INTO new_cust_id;
            
            -- If successful, link it
            UPDATE yutong_customers SET accounting_customer_id = new_cust_id WHERE id = y_cust.id;
            
        EXCEPTION WHEN unique_violation THEN
            -- If duplicate phone exists, find the existing bridge record and link
            SELECT id INTO new_cust_id FROM public.customers 
            WHERE normalized_phone = public.normalize_customer_phone(y_cust.phone)
            AND company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
            LIMIT 1;

            IF new_cust_id IS NOT NULL THEN
                UPDATE yutong_customers SET accounting_customer_id = new_cust_id WHERE id = y_cust.id;
            END IF;
        END;
    END LOOP;

    -- 2. Migrate Sinotruck Customers
    FOR s_cust IN SELECT * FROM sinotruck_customers WHERE accounting_customer_id IS NULL AND is_active = true
    LOOP
        BEGIN
            -- Attempt insert to central customers table
            INSERT INTO public.customers (
                company_id,
                customer_name,
                phone,
                email,
                billing_address,
                customer_type,
                tax_id,
                business_registration_no,
                source_module,
                source_record_id,
                created_at,
                updated_at
            ) VALUES (
                (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1),
                s_cust.company_name,
                s_cust.phone,
                s_cust.email,
                s_cust.address,
                COALESCE(s_cust.customer_type, 'business'),
                s_cust.tax_number,
                s_cust.business_registration_no,
                'sinotruck',
                s_cust.id,
                s_cust.created_at,
                s_cust.updated_at
            )
            RETURNING id INTO new_cust_id;
            
            -- If successful, link it
            UPDATE sinotruck_customers SET accounting_customer_id = new_cust_id WHERE id = s_cust.id;
            
        EXCEPTION WHEN unique_violation THEN
            -- If duplicate phone exists, find the existing bridge record and link
            SELECT id INTO new_cust_id FROM public.customers 
            WHERE normalized_phone = public.normalize_customer_phone(s_cust.phone)
            AND company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
            LIMIT 1;

            IF new_cust_id IS NOT NULL THEN
                UPDATE sinotruck_customers SET accounting_customer_id = new_cust_id WHERE id = s_cust.id;
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
