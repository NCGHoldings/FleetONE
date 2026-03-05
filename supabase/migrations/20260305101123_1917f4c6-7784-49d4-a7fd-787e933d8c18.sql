
-- Create route_permit_change_history table
CREATE TABLE public.route_permit_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.route_permits(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_type TEXT NOT NULL DEFAULT 'updated',
  changes JSONB DEFAULT '[]'::jsonb,
  description TEXT
);

-- Enable RLS
ALTER TABLE public.route_permit_change_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view change history"
  ON public.route_permit_change_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert change history"
  ON public.route_permit_change_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_route_permit_change_history_permit_id ON public.route_permit_change_history(permit_id);
CREATE INDEX idx_route_permit_change_history_changed_at ON public.route_permit_change_history(changed_at DESC);
