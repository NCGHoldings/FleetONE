-- Phase 1: Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(user_id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_system_settings_key ON public.system_settings(setting_key);

-- Insert default deadline setting (6 hours)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('data_entry_deadline_hours', '6', 'Number of hours after trip date when data entry is no longer allowed without approval'),
  ('deadline_enforcement_enabled', 'true', 'Enable or disable deadline enforcement globally')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only admins can update
CREATE POLICY "Allow read access to all authenticated users"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow super admins to update settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Allow super admins to insert settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Phase 2: Create late_entry_requests table
CREATE TYPE late_entry_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS public.late_entry_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_date DATE NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(user_id),
  reason TEXT NOT NULL,
  status late_entry_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_late_entry_requests_status ON public.late_entry_requests(status);
CREATE INDEX idx_late_entry_requests_trip_date ON public.late_entry_requests(trip_date);
CREATE INDEX idx_late_entry_requests_requested_by ON public.late_entry_requests(requested_by);

-- Enable RLS
ALTER TABLE public.late_entry_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own requests"
  ON public.late_entry_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Admins can view all requests"
  ON public.late_entry_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can create their own requests"
  ON public.late_entry_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update requests"
  ON public.late_entry_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Phase 3: Create conductor_submissions table
CREATE TYPE conductor_submission_status AS ENUM ('pending', 'processing', 'reviewed', 'approved', 'rejected', 'applied');
CREATE TYPE data_source_type AS ENUM ('manual', 'ocr', 'conductor_portal', 'import');

CREATE TABLE IF NOT EXISTS public.conductor_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_code TEXT UNIQUE NOT NULL,
  conductor_name TEXT NOT NULL,
  conductor_phone TEXT NOT NULL,
  bus_number TEXT,
  trip_date DATE,
  image_url TEXT NOT NULL,
  ocr_data JSONB,
  status conductor_submission_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  applied_to_trip_id UUID,
  applied_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_conductor_submissions_status ON public.conductor_submissions(status);
CREATE INDEX idx_conductor_submissions_trip_date ON public.conductor_submissions(trip_date);
CREATE INDEX idx_conductor_submissions_bus_number ON public.conductor_submissions(bus_number);
CREATE INDEX idx_conductor_submissions_code ON public.conductor_submissions(submission_code);

-- Enable RLS
ALTER TABLE public.conductor_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public can insert (limited columns), staff can view/update
CREATE POLICY "Allow public to submit (anonymous)"
  ON public.conductor_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view all submissions"
  ON public.conductor_submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow staff to update submissions"
  ON public.conductor_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'supervisor', 'staff')
    )
  );

-- Function to generate submission code
CREATE OR REPLACE FUNCTION public.generate_submission_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'SUB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 4));
  RETURN code;
END;
$$;

-- Trigger to auto-generate submission code
CREATE OR REPLACE FUNCTION public.set_submission_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submission_code IS NULL OR NEW.submission_code = '' THEN
    NEW.submission_code = public.generate_submission_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_submission_code
  BEFORE INSERT ON public.conductor_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_submission_code();

-- Phase 4: Alter daily_trips table
ALTER TABLE public.daily_trips
ADD COLUMN IF NOT EXISTS entry_deadline_exceeded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS late_entry_request_id UUID REFERENCES public.late_entry_requests(id),
ADD COLUMN IF NOT EXISTS data_source data_source_type DEFAULT 'manual';

-- Create index for data source filtering
CREATE INDEX IF NOT EXISTS idx_daily_trips_data_source ON public.daily_trips(data_source);

-- Update trigger for late_entry_requests
CREATE OR REPLACE FUNCTION public.update_late_entry_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_late_entry_updated_at
  BEFORE UPDATE ON public.late_entry_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_late_entry_updated_at();

CREATE TRIGGER trigger_update_conductor_submission_updated_at
  BEFORE UPDATE ON public.conductor_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_late_entry_updated_at();

-- Storage bucket for conductor submissions (will be created via Supabase dashboard or client)
-- Bucket name: conductor-submissions
-- Public: true (for image access)

COMMENT ON TABLE public.system_settings IS 'Global system configuration settings';
COMMENT ON TABLE public.late_entry_requests IS 'Requests for late data entry beyond deadline';
COMMENT ON TABLE public.conductor_submissions IS 'Public submissions from conductors via upload portal';