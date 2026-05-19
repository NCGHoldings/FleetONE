-- Drop if exists to clean up any previous failed attempts
DROP TABLE IF EXISTS public.lightvehicle_rental_invoices CASCADE;

-- Create table for Light Vehicle Rental Invoices
CREATE TABLE public.lightvehicle_rental_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rental_id UUID REFERENCES public.lightvehicle_rentals(id) ON DELETE CASCADE,
    ar_invoice_id UUID REFERENCES public.ar_invoices(id) ON DELETE SET NULL,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    rental_period VARCHAR(100),
    allocated_customer_name VARCHAR(255),
    sbu VARCHAR(100),
    user_name VARCHAR(255),
    address TEXT,
    mileage VARCHAR(100),
    ref_no VARCHAR(100),
    quote_no VARCHAR(100),
    vehicle_type VARCHAR(255),
    vehicle_no VARCHAR(100),
    
    rent_amount NUMERIC(15, 2) DEFAULT 0,
    fuel_expenses NUMERIC(15, 2) DEFAULT 0,
    gps_rental NUMERIC(15, 2) DEFAULT 0,
    discount NUMERIC(15, 2) DEFAULT 0,
    
    original_quote_amount NUMERIC(15, 2) DEFAULT 0,
    sub_total NUMERIC(15, 2) DEFAULT 0,
    price_after_discount NUMERIC(15, 2) DEFAULT 0,
    total_paid NUMERIC(15, 2) DEFAULT 0,
    balance_due NUMERIC(15, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC for generating monthly rental invoices (Fixing the billing error)
CREATE OR REPLACE FUNCTION public.generate_lightvehicle_rent_invoices(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rental RECORD;
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_revenue_account_id UUID;
    v_invoices_created INT := 0;
BEGIN
    -- 1. Get the default Sales/Revenue Account from GL Settings
    SELECT sales_revenue_account_id INTO v_revenue_account_id
    FROM public.gl_settings
    WHERE company_id = p_company_id
    LIMIT 1;

    -- 2. Find all active rentals where next_billing_date is today or in the past
    FOR v_rental IN 
        SELECT r.*, c.customer_name, c.billing_address 
        FROM public.lightvehicle_rentals r
        JOIN public.customers c ON c.id = r.customer_id
        WHERE r.status = 'active'
        AND r.next_billing_date <= CURRENT_DATE
    LOOP
        -- Generate AR Invoice Number
        v_invoice_number := 'LVR-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || upper(substring(gen_random_uuid()::text, 1, 4));

        -- Create AR Invoice
        INSERT INTO public.ar_invoices (
            invoice_number,
            customer_id,
            invoice_date,
            due_date,
            total_amount,
            paid_amount,
            balance,
            status,
            notes,
            source_module,
            company_id
        ) VALUES (
            v_invoice_number,
            v_rental.customer_id,
            v_rental.next_billing_date,
            v_rental.next_billing_date + interval '14 days',
            v_rental.monthly_rent_amount,
            0,
            v_rental.monthly_rent_amount,
            'draft',
            'Monthly Rental: ' || v_rental.vehicle_name || ' (' || COALESCE(v_rental.vehicle_number, 'N/A') || ')',
            'light_vehicle',
            p_company_id
        ) RETURNING id INTO v_invoice_id;

        -- Create AR Invoice Line
        INSERT INTO public.ar_invoice_lines (
            invoice_id,
            description,
            quantity,
            unit_price,
            tax_amount,
            line_total,
            account_id,
            company_id
        ) VALUES (
            v_invoice_id,
            'Monthly Rent: ' || v_rental.vehicle_name,
            1,
            v_rental.monthly_rent_amount,
            0,
            v_rental.monthly_rent_amount,
            v_revenue_account_id,
            p_company_id
        );

        -- Link the invoice to the new rental_invoices table structure
        INSERT INTO public.lightvehicle_rental_invoices (
            rental_id,
            ar_invoice_id,
            invoice_no,
            invoice_date,
            rental_period,
            address,
            vehicle_type,
            vehicle_no,
            rent_amount,
            original_quote_amount,
            sub_total,
            price_after_discount,
            balance_due
        ) VALUES (
            v_rental.id,
            v_invoice_id,
            v_invoice_number,
            v_rental.next_billing_date,
            v_rental.next_billing_date::text,
            COALESCE(v_rental.billing_address, ''),
            v_rental.vehicle_name,
            COALESCE(v_rental.vehicle_number, ''),
            v_rental.monthly_rent_amount,
            v_rental.monthly_rent_amount,
            v_rental.monthly_rent_amount,
            v_rental.monthly_rent_amount,
            v_rental.monthly_rent_amount
        );

        -- Update the next_billing_date
        UPDATE public.lightvehicle_rentals
        SET next_billing_date = next_billing_date + interval '1 month',
            updated_at = NOW()
        WHERE id = v_rental.id;

        v_invoices_created := v_invoices_created + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Generated ' || v_invoices_created || ' rent invoices.',
        'invoices_created', v_invoices_created
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
