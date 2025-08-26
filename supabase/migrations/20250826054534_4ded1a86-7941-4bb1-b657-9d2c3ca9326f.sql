-- Add comments/discussion functionality for feedback
CREATE TABLE public.feedback_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback_complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_internal BOOLEAN DEFAULT false -- for supervisor/admin only comments
);

-- Enable RLS
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "All authenticated users can view comments"
ON public.feedback_comments
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can add comments"
ON public.feedback_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add audit trail for escalations
CREATE TABLE public.feedback_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback_complaints(id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  escalated_by UUID NOT NULL,
  escalated_by_name TEXT NOT NULL,
  escalation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escalations
CREATE POLICY "All authenticated users can view escalations"
ON public.feedback_escalations
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Supervisors can create escalations"
ON public.feedback_escalations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Update feedback_complaints table structure
ALTER TABLE public.feedback_complaints 
ADD COLUMN IF NOT EXISTS current_handler_name TEXT,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by_name TEXT;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_feedback_escalation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.escalation_level != OLD.escalation_level THEN
    NEW.escalated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_escalation_trigger
  BEFORE UPDATE ON public.feedback_complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_escalation_timestamp();