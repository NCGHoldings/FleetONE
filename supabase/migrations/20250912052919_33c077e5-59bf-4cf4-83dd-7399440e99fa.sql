-- Create table for signature data and approval information
CREATE TABLE public.document_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.document_storage(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('prepared_by', 'approved_by', 'received_by')),
  approver_name TEXT NOT NULL,
  signature_data TEXT, -- base64 encoded signature image
  approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing frequently used names for suggestions
CREATE TABLE public.approval_name_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_name_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document approvals
CREATE POLICY "All authenticated users can view approvals"
ON public.document_approvals
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage approvals"
ON public.document_approvals
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create RLS policies for name suggestions
CREATE POLICY "All authenticated users can view name suggestions"
ON public.approval_name_suggestions
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage name suggestions"
ON public.approval_name_suggestions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_document_approvals_document_id ON public.document_approvals(document_id);
CREATE INDEX idx_document_approvals_type ON public.document_approvals(approval_type);
CREATE INDEX idx_name_suggestions_usage ON public.approval_name_suggestions(usage_count DESC);

-- Add trigger for updating timestamps
CREATE TRIGGER update_document_approvals_updated_at
  BEFORE UPDATE ON public.document_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment name suggestion usage
CREATE OR REPLACE FUNCTION public.increment_name_suggestion(p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.approval_name_suggestions (name, usage_count, last_used_at)
  VALUES (p_name, 1, now())
  ON CONFLICT (name) 
  DO UPDATE SET 
    usage_count = approval_name_suggestions.usage_count + 1,
    last_used_at = now();
END;
$$;