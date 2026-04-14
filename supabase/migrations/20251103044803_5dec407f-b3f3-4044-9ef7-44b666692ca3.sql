-- Create special_hire_advance_details table
CREATE TABLE special_hire_advance_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES special_hire_quotations(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES special_hire_payments(id) ON DELETE SET NULL,
  
  -- Auto-captured fields
  quotation_no TEXT NOT NULL,
  hire_date DATE NOT NULL,
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  number_of_days INTEGER NOT NULL,
  
  -- Driver details
  driver_name TEXT NOT NULL,
  driver_contact TEXT NOT NULL,
  driver_meal_allowance NUMERIC(10,2) DEFAULT 0,
  driver_salary NUMERIC(10,2) DEFAULT 0,
  driver_highway_charges NUMERIC(10,2) DEFAULT 0,
  driver_other_charges NUMERIC(10,2) DEFAULT 0,
  driver_signature_data TEXT,
  driver_signature_type TEXT,
  
  -- Conductor/Assistant details
  conductor_name TEXT,
  conductor_contact TEXT,
  conductor_meal_allowance NUMERIC(10,2) DEFAULT 0,
  conductor_salary NUMERIC(10,2) DEFAULT 0,
  conductor_signature_data TEXT,
  conductor_signature_type TEXT,
  
  -- Authorization signatures
  prepared_by_name TEXT NOT NULL,
  prepared_by_signature_data TEXT,
  prepared_by_signature_type TEXT,
  
  checked_by_name TEXT,
  checked_by_signature_data TEXT,
  checked_by_signature_type TEXT,
  
  authorized_by_name TEXT,
  authorized_by_signature_data TEXT,
  authorized_by_signature_type TEXT,
  
  -- Calculated totals
  total_amount NUMERIC(10,2) NOT NULL,
  
  -- PDF storage
  pdf_document_data TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status TEXT DEFAULT 'draft',
  notes TEXT
);

-- Enable RLS
ALTER TABLE special_hire_advance_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view advance details"
  ON special_hire_advance_details FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can manage advance details"
  ON special_hire_advance_details FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'finance'::app_role)
  );

-- Indexes for faster lookups
CREATE INDEX idx_advance_details_quotation ON special_hire_advance_details(quotation_id);
CREATE INDEX idx_advance_details_payment ON special_hire_advance_details(payment_id);

-- Add trigger for updated_at
CREATE TRIGGER update_special_hire_advance_details_updated_at
  BEFORE UPDATE ON special_hire_advance_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();