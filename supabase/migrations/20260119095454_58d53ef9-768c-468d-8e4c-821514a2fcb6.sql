-- Add level columns to chart_of_accounts table for 5-level hierarchy
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level1 TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level2 TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level3 TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level4 TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level5 TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_level INTEGER DEFAULT 5;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_header BOOLEAN DEFAULT false;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS gl_code TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coa_gl_code ON chart_of_accounts(gl_code);
CREATE INDEX IF NOT EXISTS idx_coa_level1 ON chart_of_accounts(level1);
CREATE INDEX IF NOT EXISTS idx_coa_account_level ON chart_of_accounts(account_level);

-- Create upload history table for audit
CREATE TABLE IF NOT EXISTS coa_upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  total_records INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  file_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on upload history
ALTER TABLE coa_upload_history ENABLE ROW LEVEL SECURITY;

-- Create policies for upload history
CREATE POLICY "Users can view upload history" ON coa_upload_history
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert upload history" ON coa_upload_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);