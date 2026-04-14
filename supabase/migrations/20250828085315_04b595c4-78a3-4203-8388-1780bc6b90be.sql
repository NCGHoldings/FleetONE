-- Create sequence first before using it
CREATE SEQUENCE IF NOT EXISTS quotation_seq START 1;

-- Create special hire quotations table with proper sequence reference
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
  bus_type_id uuid,
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

-- Enable RLS on quotations table
ALTER TABLE public.special_hire_quotations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotations
CREATE POLICY "All authenticated users can view quotations" ON public.special_hire_quotations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage quotations" ON public.special_hire_quotations FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));