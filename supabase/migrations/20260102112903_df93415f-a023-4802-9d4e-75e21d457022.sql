
-- Create feedback_levels table for configurable hierarchy
CREATE TABLE public.feedback_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  level_name TEXT NOT NULL,
  description TEXT,
  color_code TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'users',
  can_escalate_to INTEGER,
  required_role app_role,
  sla_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feedback_meetings table
CREATE TABLE public.feedback_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  level INTEGER NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'weekly_staff',
  title TEXT,
  conducted_by UUID REFERENCES auth.users(id),
  conducted_by_name TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  previous_meeting_id UUID REFERENCES public.feedback_meetings(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feedback_items table
CREATE TABLE public.feedback_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_number SERIAL,
  meeting_id UUID REFERENCES public.feedback_meetings(id),
  feedback_complaint_id UUID REFERENCES public.feedback_complaints(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  raised_by_name TEXT,
  raised_by_staff_id UUID,
  current_level INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated', 'closed')),
  action_taken TEXT,
  resolution TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  due_date DATE,
  escalation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feedback_item_history table for complete tracking
CREATE TABLE public.feedback_item_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_item_id UUID NOT NULL REFERENCES public.feedback_items(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'escalated', 'resolved', 'commented', 'assigned', 'status_changed')),
  action_by UUID,
  action_by_name TEXT,
  notes TEXT,
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.feedback_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_item_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_levels
CREATE POLICY "Anyone can view feedback levels" ON public.feedback_levels
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feedback levels" ON public.feedback_levels
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- RLS Policies for feedback_meetings
CREATE POLICY "Authenticated users can view meetings" ON public.feedback_meetings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage meetings" ON public.feedback_meetings
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'supervisor'::app_role]));

-- RLS Policies for feedback_items
CREATE POLICY "Authenticated users can view items" ON public.feedback_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage items" ON public.feedback_items
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'supervisor'::app_role]));

-- RLS Policies for feedback_item_history
CREATE POLICY "Authenticated users can view history" ON public.feedback_item_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert history" ON public.feedback_item_history
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'supervisor'::app_role]));

-- Insert default feedback levels
INSERT INTO public.feedback_levels (level_number, level_name, description, color_code, icon, can_escalate_to, sla_days) VALUES
  (1, 'Ground Staff', 'Weekly staff meetings to collect feedback from drivers and conductors', '#22C55E', 'users', 2, 7),
  (2, 'Supervisor', 'Supervisor review meetings to address escalated issues', '#F59E0B', 'user-check', 3, 5),
  (3, 'Manager', 'Management meetings for complex issues requiring higher authority', '#3B82F6', 'briefcase', 4, 3),
  (4, 'CEO/Executive', 'Executive review for critical matters requiring top-level decisions', '#EF4444', 'crown', NULL, 2);

-- Create indexes for better performance
CREATE INDEX idx_feedback_items_current_level ON public.feedback_items(current_level);
CREATE INDEX idx_feedback_items_status ON public.feedback_items(status);
CREATE INDEX idx_feedback_items_meeting_id ON public.feedback_items(meeting_id);
CREATE INDEX idx_feedback_meetings_level ON public.feedback_meetings(level);
CREATE INDEX idx_feedback_meetings_status ON public.feedback_meetings(status);
CREATE INDEX idx_feedback_item_history_item_id ON public.feedback_item_history(feedback_item_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_levels_updated_at
  BEFORE UPDATE ON public.feedback_levels
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER update_feedback_meetings_updated_at
  BEFORE UPDATE ON public.feedback_meetings
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER update_feedback_items_updated_at
  BEFORE UPDATE ON public.feedback_items
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
