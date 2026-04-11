CREATE TABLE IF NOT EXISTS public.magiya_daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  route_name TEXT,
  bus_number TEXT,
  total_passengers INT DEFAULT 0,
  total_revenue_lkr NUMERIC(15, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending',
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_bus_date UNIQUE (bus_number, report_date)
);

ALTER TABLE public.magiya_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on magiya reports"
ON public.magiya_daily_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role full access"
ON public.magiya_daily_reports FOR ALL
TO service_role
USING (true)
WITH CHECK (true);