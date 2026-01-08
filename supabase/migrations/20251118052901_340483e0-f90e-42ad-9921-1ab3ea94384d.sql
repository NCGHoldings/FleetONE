-- Create special_hire_trip_adjustments table
CREATE TABLE IF NOT EXISTS special_hire_trip_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES special_hire_quotations(id) ON DELETE CASCADE NOT NULL,
  
  -- Actual Trip Data
  actual_km_traveled NUMERIC(10,2),
  original_quoted_km NUMERIC(10,2),
  extra_km NUMERIC(10,2), -- Can be positive or negative
  
  -- KM-based charges
  extra_km_charge_per_km NUMERIC(10,2),
  extra_km_total_charge NUMERIC(10,2), -- extra_km * charge_per_km
  
  -- Additional Expenses (array of line items)
  additional_expenses JSONB DEFAULT '[]', -- [{description, amount, category}]
  total_additional_expenses NUMERIC(10,2) DEFAULT 0,
  
  -- Calculations
  original_quotation_amount NUMERIC(10,2),
  adjustment_amount NUMERIC(10,2), -- extra_km + additional expenses
  final_trip_amount NUMERIC(10,2), -- original + adjustment
  advance_already_paid NUMERIC(10,2),
  balance_due NUMERIC(10,2), -- final - advance
  
  -- Metadata
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  adjustment_status TEXT DEFAULT 'draft', -- draft, finalized, invoiced
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to special_hire_invoices for adjustment tracking
ALTER TABLE special_hire_invoices 
ADD COLUMN IF NOT EXISTS has_adjustments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adjustment_id UUID REFERENCES special_hire_trip_adjustments(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trip_adjustments_quotation 
ON special_hire_trip_adjustments(quotation_id);

CREATE INDEX IF NOT EXISTS idx_trip_adjustments_status 
ON special_hire_trip_adjustments(adjustment_status);

-- Enable RLS
ALTER TABLE special_hire_trip_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view trip adjustments"
  ON special_hire_trip_adjustments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create trip adjustments"
  ON special_hire_trip_adjustments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update trip adjustments"
  ON special_hire_trip_adjustments FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete trip adjustments"
  ON special_hire_trip_adjustments FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trip_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_trip_adjustments_timestamp
  BEFORE UPDATE ON special_hire_trip_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_adjustments_updated_at();