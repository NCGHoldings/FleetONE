-- Create sequence first
CREATE SEQUENCE IF NOT EXISTS quotation_seq START 1;

-- Create bus_types table for bus type master data
CREATE TABLE IF NOT EXISTS public.bus_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer NOT NULL,
  avg_km_per_l numeric DEFAULT 8.0,
  features text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hire_rate_cards table for pricing rules
CREATE TABLE IF NOT EXISTS public.hire_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_type text NOT NULL CHECK (hire_type IN ('Outside', 'Lyceum')),
  bus_type_id uuid REFERENCES public.bus_types(id),
  from_km numeric NOT NULL DEFAULT 0,
  to_km numeric,
  rate_per_km_lkr numeric,
  flat_fee_lkr numeric,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_range CHECK (to_km IS NULL OR to_km > from_km),
  CONSTRAINT has_rate CHECK (rate_per_km_lkr IS NOT NULL OR flat_fee_lkr IS NOT NULL)
);

-- Create fuel_settings table
CREATE TABLE IF NOT EXISTS public.fuel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diesel_price_lkr_per_l numeric NOT NULL DEFAULT 350.0,
  parking_location_name text DEFAULT 'Main Depot',
  parking_lat numeric DEFAULT 6.9271,
  parking_lng numeric DEFAULT 79.8612,
  is_default boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create quotations table to track special hire quotations
CREATE TABLE IF NOT EXISTS public.special_hire_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no text UNIQUE NOT NULL DEFAULT 'QUO-' || extract(year from now()) || '-' || LPAD(nextval('quotation_seq')::text, 4, '0'),
  
  -- Customer details
  company_name text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  special_request text,
  
  -- Trip details
  bus_type_id uuid REFERENCES public.bus_types(id),
  hire_type text NOT NULL CHECK (hire_type IN ('Outside', 'Lyceum')),
  number_of_buses integer NOT NULL DEFAULT 1,
  pickup_location text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  drop_location text NOT NULL,
  drop_lat numeric,
  drop_lng numeric,
  intermediate_stops jsonb DEFAULT '[]',
  number_of_passengers integer NOT NULL,
  pickup_datetime timestamp with time zone NOT NULL,
  drop_datetime timestamp with time zone NOT NULL,
  
  -- Distance and cost calculations
  km_parking_to_pickup numeric DEFAULT 0,
  km_trip numeric DEFAULT 0,
  km_drop_to_parking numeric DEFAULT 0,
  fuel_cost_fuel_only numeric DEFAULT 0,
  hire_charge numeric DEFAULT 0,
  extra_charges numeric DEFAULT 0,
  gross_revenue numeric DEFAULT 0,
  driver_charge numeric DEFAULT 0,
  other_expenses jsonb DEFAULT '[]',
  commission_pct numeric DEFAULT 5.0,
  commission_amount numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  
  -- Status and workflow
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'confirmed', 'declined')),
  valid_until date,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Link to confirmed trip
  trip_id uuid
);

-- Enable RLS
ALTER TABLE public.bus_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hire_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_hire_quotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view bus types" ON public.bus_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage bus types" ON public.bus_types FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view rate cards" ON public.hire_rate_cards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage rate cards" ON public.hire_rate_cards FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view fuel settings" ON public.fuel_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage fuel settings" ON public.fuel_settings FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view quotations" ON public.special_hire_quotations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage quotations" ON public.special_hire_quotations FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));