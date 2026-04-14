-- Create accident_records table
CREATE TABLE public.accident_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  no INTEGER GENERATED ALWAYS AS IDENTITY,
  vehicle_number TEXT NOT NULL,
  accident_date DATE NOT NULL,
  bl_number TEXT,
  details_of_accident TEXT,
  estimate_amount NUMERIC(15,2),
  approved_amount NUMERIC(15,2),
  process_details TEXT,
  accident_mark BOOLEAN DEFAULT false,
  salvage BOOLEAN DEFAULT false,
  salvage_disposition TEXT CHECK (salvage_disposition IN ('Stored', 'Sold', 'Disposed')),
  salvage_value NUMERIC(15,2),
  salvage_sale_date DATE,
  reported_by TEXT,
  location TEXT,
  insurer_claim_ref TEXT,
  status TEXT DEFAULT 'Reported' CHECK (status IN ('Reported', 'Estimate', 'Approved', 'Settlement', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(bl_number),
  UNIQUE(vehicle_number, accident_date)
);

-- Create accident_documents table
CREATE TABLE public.accident_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accident_id UUID NOT NULL REFERENCES public.accident_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'JPG', 'PNG', 'DOCX')),
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(accident_id, file_name, version)
);

-- Create accident_audit_trail table
CREATE TABLE public.accident_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accident_id UUID NOT NULL REFERENCES public.accident_records(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Enable RLS
ALTER TABLE public.accident_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accident_records
CREATE POLICY "All authenticated users can view accident records" 
ON public.accident_records 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins and claims officers can manage accident records" 
ON public.accident_records 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for accident_documents
CREATE POLICY "All authenticated users can view accident documents" 
ON public.accident_documents 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins and claims officers can manage accident documents" 
ON public.accident_documents 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for accident_audit_trail
CREATE POLICY "All authenticated users can view audit trail" 
ON public.accident_audit_trail 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "System can insert audit records" 
ON public.accident_audit_trail 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_accident_records_vehicle_number ON public.accident_records(vehicle_number);
CREATE INDEX idx_accident_records_accident_date ON public.accident_records(accident_date);
CREATE INDEX idx_accident_records_bl_number ON public.accident_records(bl_number);
CREATE INDEX idx_accident_records_status ON public.accident_records(status);
CREATE INDEX idx_accident_documents_accident_id ON public.accident_documents(accident_id);

-- Create trigger for updated_at
CREATE TRIGGER update_accident_records_updated_at
  BEFORE UPDATE ON public.accident_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_accident_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, new_value, action)
    VALUES (NEW.id, auth.uid(), 'record_created', 'Record created', 'INSERT');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check each field for changes
    IF OLD.vehicle_number != NEW.vehicle_number THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'vehicle_number', OLD.vehicle_number, NEW.vehicle_number, 'UPDATE');
    END IF;
    IF OLD.accident_date != NEW.accident_date THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'accident_date', OLD.accident_date::text, NEW.accident_date::text, 'UPDATE');
    END IF;
    IF OLD.status != NEW.status THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status, 'UPDATE');
    END IF;
    IF OLD.estimate_amount != NEW.estimate_amount OR (OLD.estimate_amount IS NULL) != (NEW.estimate_amount IS NULL) THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'estimate_amount', OLD.estimate_amount::text, NEW.estimate_amount::text, 'UPDATE');
    END IF;
    IF OLD.approved_amount != NEW.approved_amount OR (OLD.approved_amount IS NULL) != (NEW.approved_amount IS NULL) THEN
      INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'approved_amount', OLD.approved_amount::text, NEW.approved_amount::text, 'UPDATE');
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.accident_audit_trail (accident_id, changed_by, field_name, old_value, action)
    VALUES (OLD.id, auth.uid(), 'record_deleted', 'Record deleted', 'DELETE');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
CREATE TRIGGER accident_records_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.accident_records
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_accident_changes();