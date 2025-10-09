-- Step 1: Add signature fields to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS signature_data TEXT,
  ADD COLUMN IF NOT EXISTS signature_type TEXT CHECK (signature_type IN ('drawing', 'text', 'image')),
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- Step 2: Create quotation signatures table
CREATE TABLE IF NOT EXISTS yutong_quotation_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES yutong_quotations(id) ON DELETE CASCADE NOT NULL,
  signature_role TEXT NOT NULL CHECK (signature_role IN ('sales_manager', 'approved_by', 'customer')),
  signer_name TEXT NOT NULL,
  signature_data TEXT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('drawing', 'text', 'image')),
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quotation_id, signature_role)
);

-- Step 3: Enable RLS
ALTER TABLE yutong_quotation_signatures ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "authenticated_select_signatures"
  ON yutong_quotation_signatures FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "staff_manage_signatures"
  ON yutong_quotation_signatures FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Step 5: Create updated_at trigger
CREATE TRIGGER update_yutong_quotation_signatures_updated_at
  BEFORE UPDATE ON yutong_quotation_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();