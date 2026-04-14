-- Create daily bus expenses table for per-bus per-day expense tracking
CREATE TABLE IF NOT EXISTS public.daily_bus_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  
  -- Fuel expenses
  fuel_cost NUMERIC DEFAULT 0,
  diesel_price_per_liter NUMERIC,
  fuel_liters NUMERIC GENERATED ALWAYS AS (
    CASE WHEN diesel_price_per_liter > 0 
    THEN fuel_cost / diesel_price_per_liter 
    ELSE 0 END
  ) STORED,
  
  -- Daily operating expenses (same categories as current system)
  repair NUMERIC DEFAULT 0,
  tyre_tube NUMERIC DEFAULT 0,
  salary NUMERIC DEFAULT 0,
  police NUMERIC DEFAULT 0,
  food NUMERIC DEFAULT 0,
  emission_fitness NUMERIC DEFAULT 0,
  permits_renewal NUMERIC DEFAULT 0,
  staff_accommodation NUMERIC DEFAULT 0,
  highway_charges NUMERIC DEFAULT 0,
  accident_compensation NUMERIC DEFAULT 0,
  parking NUMERIC DEFAULT 0,
  log_sheet NUMERIC DEFAULT 0,
  vehicle_hire NUMERIC DEFAULT 0,
  ntc NUMERIC DEFAULT 0,
  runner NUMERIC DEFAULT 0,
  short_misc NUMERIC DEFAULT 0,
  temporary_permit NUMERIC DEFAULT 0,
  body_wash NUMERIC DEFAULT 0,
  legal_court NUMERIC DEFAULT 0,
  other NUMERIC DEFAULT 0,
  
  -- Totals (auto-calculated)
  total_daily_expenses NUMERIC GENERATED ALWAYS AS (
    COALESCE(fuel_cost, 0) + COALESCE(repair, 0) + COALESCE(tyre_tube, 0) + 
    COALESCE(salary, 0) + COALESCE(police, 0) + COALESCE(food, 0) + 
    COALESCE(emission_fitness, 0) + COALESCE(permits_renewal, 0) + 
    COALESCE(staff_accommodation, 0) + COALESCE(highway_charges, 0) + 
    COALESCE(accident_compensation, 0) + COALESCE(parking, 0) + 
    COALESCE(log_sheet, 0) + COALESCE(vehicle_hire, 0) + COALESCE(ntc, 0) + 
    COALESCE(runner, 0) + COALESCE(short_misc, 0) + COALESCE(temporary_permit, 0) + 
    COALESCE(body_wash, 0) + COALESCE(legal_court, 0) + COALESCE(other, 0)
  ) STORED,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per bus per day
  CONSTRAINT unique_bus_expense_date UNIQUE(bus_id, expense_date)
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_bus_expenses_date ON public.daily_bus_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_daily_bus_expenses_bus_date ON public.daily_bus_expenses(bus_id, expense_date);

-- Enable RLS
ALTER TABLE public.daily_bus_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as daily_trips)
CREATE POLICY "Users can view daily bus expenses"
  ON public.daily_bus_expenses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert daily bus expenses"
  ON public.daily_bus_expenses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own daily bus expenses"
  ON public.daily_bus_expenses FOR UPDATE
  USING (created_by = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('super_admin', 'admin', 'supervisor')
  ));

CREATE POLICY "Admins can delete daily bus expenses"
  ON public.daily_bus_expenses FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('super_admin', 'admin')
  ));

-- Trigger for updated_at
CREATE TRIGGER update_daily_bus_expenses_updated_at
  BEFORE UPDATE ON public.daily_bus_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();