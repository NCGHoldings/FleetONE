-- Add is_mercantile column to holidays table
ALTER TABLE holidays 
ADD COLUMN IF NOT EXISTS is_mercantile BOOLEAN DEFAULT FALSE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_mercantile ON holidays(is_mercantile);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- Add adjusted_reason and original_scheduled_date to governance_occurrences
ALTER TABLE governance_occurrences
ADD COLUMN IF NOT EXISTS adjusted_reason TEXT,
ADD COLUMN IF NOT EXISTS original_scheduled_date DATE;

-- Create blocked_periods table for vacation periods
CREATE TABLE IF NOT EXISTS blocked_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS for blocked_periods
ALTER TABLE blocked_periods ENABLE ROW LEVEL SECURITY;

-- Create policies for blocked_periods
CREATE POLICY "Admins can manage blocked periods"
ON blocked_periods
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'governance_admin')
);

CREATE POLICY "All authenticated users can view blocked periods"
ON blocked_periods
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert Sri Lankan 2025 holidays
INSERT INTO holidays (holiday_date, holiday_name, type, is_mercantile, country) VALUES
  ('2025-01-03', 'Duruthu Full Moon Poya Day', 'Public', false, 'LK'),
  ('2025-01-15', 'Tamil Thai Pongal Day', 'Public', true, 'LK'),
  ('2025-02-01', 'Navam Full Moon Poya Day', 'Public', false, 'LK'),
  ('2025-02-04', 'Independence Day', 'Public', true, 'LK'),
  ('2025-02-15', 'Mahasivarathri Day', 'Public', false, 'LK'),
  ('2025-03-02', 'Medin Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-03-21', 'Id-Ul-Fitre (Ramazan Festival Day)', 'Public', false, 'LK'),
  ('2025-04-01', 'Bak Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-04-03', 'Good Friday', 'Public', false, 'LK'),
  ('2025-04-13', 'Day prior to Sinhala & Tamil New Year Day', 'Public', true, 'LK'),
  ('2025-04-14', 'Sinhala & Tamil New Year Day', 'Public', true, 'LK'),
  ('2025-05-01', 'May Day (International Workers Day)', 'Public', true, 'LK'),
  ('2025-05-01', 'Vesak Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-05-02', 'Day following Vesak Full Moon Poya Day', 'Public', false, 'LK'),
  ('2025-05-28', 'Id-Ul-Allah (Hadji Festival Day)', 'Public', false, 'LK'),
  ('2025-05-30', 'Adhi Poson Full Moon Poya Day', 'Public', false, 'LK'),
  ('2025-06-29', 'Poson Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-07-29', 'Esala Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-08-26', 'Milad-Un-Nabi (Holy Prophets Birthday)', 'Public', true, 'LK'),
  ('2025-08-27', 'Nikini Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-09-26', 'Binara Full Moon Poya Day', 'Public', false, 'LK'),
  ('2025-10-25', 'Vap Full Moon Poya Day', 'Public', false, 'LK'),
  ('2025-11-08', 'Deepawali Festival Day', 'Public', false, 'LK'),
  ('2025-11-24', 'Ill Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-12-23', 'Unduwap Full Moon Poya Day', 'Public', true, 'LK'),
  ('2025-12-25', 'Christmas Day', 'Public', true, 'LK')
ON CONFLICT DO NOTHING;