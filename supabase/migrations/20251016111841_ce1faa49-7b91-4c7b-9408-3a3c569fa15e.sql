-- Add income_details column for detailed revenue breakdown
ALTER TABLE public.daily_trips 
ADD COLUMN IF NOT EXISTS income_details JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.daily_trips.income_details IS 'Detailed revenue breakdown: {daily_collection, call_collection, agent_collection, luggage_collection, missional, others, others_description}';

-- Create function to calculate total income from income_details
CREATE OR REPLACE FUNCTION calculate_income_from_details(details JSONB)
RETURNS NUMERIC AS $$
BEGIN
  IF details IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE((details->>'daily_collection')::NUMERIC, 0) +
         COALESCE((details->>'call_collection')::NUMERIC, 0) +
         COALESCE((details->>'agent_collection')::NUMERIC, 0) +
         COALESCE((details->>'luggage_collection')::NUMERIC, 0) +
         COALESCE((details->>'missional')::NUMERIC, 0) +
         COALESCE((details->>'others')::NUMERIC, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate total expenses from other_expenses_details
CREATE OR REPLACE FUNCTION calculate_expenses_from_details(details JSONB)
RETURNS NUMERIC AS $$
BEGIN
  IF details IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE((details->>'fuel')::NUMERIC, 0) +
         COALESCE((details->>'food')::NUMERIC, 0) +
         COALESCE((details->>'salary')::NUMERIC, 0) +
         COALESCE((details->>'runner')::NUMERIC, 0) +
         COALESCE((details->>'police')::NUMERIC, 0) +
         COALESCE((details->>'phone')::NUMERIC, 0) +
         COALESCE((details->>'water')::NUMERIC, 0) +
         COALESCE((details->>'parking')::NUMERIC, 0) +
         COALESCE((details->>'toll')::NUMERIC, 0) +
         COALESCE((details->>'repair')::NUMERIC, 0) +
         COALESCE((details->>'other')::NUMERIC, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function to auto-calculate totals
CREATE OR REPLACE FUNCTION update_trip_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate income from income_details if present
  IF NEW.income_details IS NOT NULL THEN
    NEW.income := calculate_income_from_details(NEW.income_details);
  END IF;
  
  -- Calculate other_expenses from other_expenses_details if present
  IF NEW.other_expenses_details IS NOT NULL THEN
    NEW.other_expenses := calculate_expenses_from_details(NEW.other_expenses_details);
  END IF;
  
  -- Calculate total_expenses (fuel_cost + other_expenses)
  NEW.total_expenses := COALESCE(NEW.fuel_cost, 0) + COALESCE(NEW.other_expenses, 0);
  
  -- Calculate net_income (income - total_expenses)
  NEW.net_income := COALESCE(NEW.income, 0) - COALESCE(NEW.total_expenses, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate totals on insert/update
DROP TRIGGER IF EXISTS trigger_update_trip_totals ON public.daily_trips;
CREATE TRIGGER trigger_update_trip_totals
  BEFORE INSERT OR UPDATE OF income_details, other_expenses_details, fuel_cost
  ON public.daily_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_totals();