-- Migration: Light Vehicle Rentals and Auto Billing

CREATE TABLE IF NOT EXISTS public.lightvehicle_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_name TEXT NOT NULL,
    vehicle_number TEXT,
    customer_id UUID REFERENCES public.customers(id),
    start_date DATE NOT NULL,
    end_date DATE,
    monthly_rent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    next_billing_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated')),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lightvehicle_rental_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.lightvehicle_rentals(id) ON DELETE CASCADE,
    ar_invoice_id UUID NOT NULL REFERENCES public.ar_invoices(id) ON DELETE CASCADE,
    billing_period DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lightvehicle_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lightvehicle_rental_invoices ENABLE ROW LEVEL SECURITY;

-- Policies for lightvehicle_rentals
CREATE POLICY "Users can view lightvehicle_rentals in their company" ON public.lightvehicle_rentals
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert lightvehicle_rentals in their company" ON public.lightvehicle_rentals
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update lightvehicle_rentals in their company" ON public.lightvehicle_rentals
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()
        )
    );

-- Policies for lightvehicle_rental_invoices
CREATE POLICY "Users can view lightvehicle_rental_invoices" ON public.lightvehicle_rental_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.lightvehicle_rentals r
            WHERE r.id = lightvehicle_rental_invoices.rental_id
            AND r.company_id IN (
                SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert lightvehicle_rental_invoices" ON public.lightvehicle_rental_invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lightvehicle_rentals r
            WHERE r.id = lightvehicle_rental_invoices.rental_id
            AND r.company_id IN (
                SELECT company_id FROM public.user_company_access WHERE user_id = auth.uid()
            )
        )
    );

-- RPC for generating monthly rental invoices
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

    -- If no revenue account is configured, we can still create the invoice, 
    -- but users will need to map it during approval. We will let it be NULL if missing.

    -- 2. Find all active rentals where next_billing_date is today or in the past
    FOR v_rental IN 
        SELECT r.*, c.customer_name 
        FROM public.lightvehicle_rentals r
        JOIN public.customers c ON c.id = r.customer_id
        WHERE r.company_id = p_company_id 
        AND r.status = 'active'
        AND r.next_billing_date <= CURRENT_DATE
    LOOP
        -- Generate AR Invoice Number
        v_invoice_number := 'RNT-' || to_char(CURRENT_DATE, 'YYMM') || '-' || upper(substring(gen_random_uuid()::text, 1, 4));

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
            'Monthly Rental: ' || v_rental.vehicle_name || ' (' || COALESCE(v_rental.vehicle_number, 'N/A') || ') - Billing Period: ' || v_rental.next_billing_date::text,
            'lightvehicle_rentals',
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

        -- Link the invoice to the rental
        INSERT INTO public.lightvehicle_rental_invoices (
            rental_id,
            ar_invoice_id,
            billing_period,
            amount
        ) VALUES (
            v_rental.id,
            v_invoice_id,
            v_rental.next_billing_date,
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_lightvehicle_rent_invoices(UUID) TO authenticated;
