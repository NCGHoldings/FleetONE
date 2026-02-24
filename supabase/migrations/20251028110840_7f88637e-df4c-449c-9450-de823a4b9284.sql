-- Create yutong_invoice_signatures table
CREATE TABLE yutong_invoice_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_record_id uuid NOT NULL,
  signature_role text NOT NULL CHECK (signature_role IN ('prepared_by', 'approved_by', 'received_by')),
  signer_name text NOT NULL,
  signature_data text NOT NULL,
  signature_type text NOT NULL CHECK (signature_type IN ('drawing', 'text', 'image')),
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  signed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(invoice_record_id, signature_role)
);

-- Enable RLS
ALTER TABLE yutong_invoice_signatures ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view invoice signatures"
  ON yutong_invoice_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage invoice signatures"
  ON yutong_invoice_signatures FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Indexes
CREATE INDEX idx_yutong_invoice_signatures_invoice ON yutong_invoice_signatures(invoice_record_id);
CREATE INDEX idx_yutong_invoice_signatures_role ON yutong_invoice_signatures(signature_role);