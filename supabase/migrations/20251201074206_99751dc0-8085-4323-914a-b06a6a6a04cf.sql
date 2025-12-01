-- Create signature automation settings table
CREATE TABLE IF NOT EXISTS special_hire_signature_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_role TEXT NOT NULL UNIQUE CHECK (signature_role IN ('prepared_by', 'checked_by', 'approved_by')),
  default_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE special_hire_signature_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admin and admin can manage signature settings"
  ON special_hire_signature_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Authenticated users can view signature settings"
  ON special_hire_signature_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert default rows
INSERT INTO special_hire_signature_settings (signature_role, is_enabled) 
VALUES 
  ('prepared_by', true),
  ('checked_by', true),
  ('approved_by', true)
ON CONFLICT (signature_role) DO NOTHING;

-- Add update trigger
CREATE TRIGGER update_special_hire_signature_settings_updated_at
  BEFORE UPDATE ON special_hire_signature_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();