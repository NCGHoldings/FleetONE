-- Add index on trip_date for daily_trips — this is the most queried column
-- and was missing an index, causing full table scans on every analytics query.
-- Also add composite indexes for common join patterns.

CREATE INDEX IF NOT EXISTS idx_daily_trips_trip_date 
  ON public.daily_trips(trip_date DESC);

-- Composite index for the analytics query pattern: date range + bus grouping
CREATE INDEX IF NOT EXISTS idx_daily_trips_date_bus 
  ON public.daily_trips(trip_date, bus_id);

-- Index for expense date lookups (also used in analytics)
CREATE INDEX IF NOT EXISTS idx_daily_bus_expenses_date 
  ON public.daily_bus_expenses(expense_date);
