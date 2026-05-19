-- Drop if exists to clean up any previous failed attempts
DROP TABLE IF EXISTS public.lightvehicle_rental_invoices CASCADE;

-- Create table for Light Vehicle Rental Invoices
CREATE TABLE public.lightvehicle_rental_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rental_id UUID REFERENCES public.lightvehicle_rentals(id) ON DELETE CASCADE,
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
