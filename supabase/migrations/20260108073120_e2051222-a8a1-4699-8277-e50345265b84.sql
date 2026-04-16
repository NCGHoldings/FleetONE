-- Marketing Management System - Core Tables

-- 1. Marketing Team Members
CREATE TABLE public.marketing_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id),
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  designation TEXT,
  department TEXT DEFAULT 'Marketing',
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  total_credits NUMERIC DEFAULT 0,
  is_task_assigner BOOLEAN DEFAULT false,
  is_task_confirmer BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Marketing Task Categories (backend managed)
CREATE TABLE public.marketing_task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL,
  description TEXT,
  average_hours NUMERIC NOT NULL DEFAULT 4,
  credit_multiplier NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Marketing Projects
CREATE TABLE public.marketing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES public.companies(id),
  status TEXT DEFAULT 'planning',
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  project_lead_id UUID REFERENCES public.marketing_team_members(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Marketing Job Requests (MKT-HR)
CREATE TABLE public.marketing_job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_completion_date DATE NOT NULL,
  additional_notes TEXT,
  company_id UUID REFERENCES public.companies(id),
  requested_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Marketing Tasks
CREATE TABLE public.marketing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.marketing_task_categories(id),
  job_request_id UUID REFERENCES public.marketing_job_requests(id),
  project_id UUID REFERENCES public.marketing_projects(id),
  company_id UUID REFERENCES public.companies(id),
  status TEXT DEFAULT 'planning',
  priority TEXT DEFAULT 'medium',
  assigned_by UUID REFERENCES auth.users(id),
  assigned_hours NUMERIC,
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_hours_spent NUMERIC,
  credits_awarded NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Marketing Task Assignees (many-to-many)
CREATE TABLE public.marketing_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.marketing_tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.marketing_team_members(id),
  role TEXT DEFAULT 'worker',
  credits_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Marketing Task Feedback
CREATE TABLE public.marketing_task_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.marketing_tasks(id) ON DELETE CASCADE,
  given_by UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL,
  message TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Marketing Social Accounts
CREATE TABLE public.marketing_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_url TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Marketing Social Stats
CREATE TABLE public.marketing_social_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.marketing_social_accounts(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  followers_count BIGINT,
  following_count BIGINT,
  posts_count BIGINT,
  engagement_rate NUMERIC,
  likes_total BIGINT,
  comments_total BIGINT,
  shares_total BIGINT,
  views_total BIGINT,
  reach BIGINT,
  impressions BIGINT,
  raw_data JSONB
);

-- 10. Marketing Credit Settings
CREATE TABLE public.marketing_credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default credit settings
INSERT INTO public.marketing_credit_settings (setting_key, setting_value, description) VALUES
  ('base_credit_per_hour', 1, 'Base credits earned per hour of work'),
  ('early_completion_multiplier', 2, 'Multiplier for hours saved'),
  ('late_penalty_multiplier', 0.5, 'Penalty multiplier for late completion'),
  ('office_hours_per_day', 8, 'Working hours per day'),
  ('weekend_days', 2, 'Number of weekend days (Sat, Sun)');

-- Insert default task categories
INSERT INTO public.marketing_task_categories (category_name, average_hours, description) VALUES
  ('Logo Design', 8, 'Logo and brand identity design'),
  ('Banner Design', 4, 'Social media banners and graphics'),
  ('Video Editing', 16, 'Video production and editing'),
  ('Content Writing', 6, 'Blog posts and articles'),
  ('Social Media Post', 2, 'Creating social media content'),
  ('Photography', 8, 'Product or event photography'),
  ('Website Update', 4, 'Minor website changes'),
  ('Email Campaign', 6, 'Email marketing campaigns'),
  ('Print Design', 8, 'Flyers, brochures, business cards'),
  ('Animation', 24, 'Motion graphics and animation');

-- Create sequences for auto-numbering
CREATE SEQUENCE marketing_job_request_seq START 1;
CREATE SEQUENCE marketing_task_seq START 1;
CREATE SEQUENCE marketing_project_seq START 1;

-- Function to generate job request number
CREATE OR REPLACE FUNCTION generate_job_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'MKT-HR-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('marketing_job_request_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate task number
CREATE OR REPLACE FUNCTION generate_marketing_task_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.task_number := 'MKT-TASK-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('marketing_task_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate project number
CREATE OR REPLACE FUNCTION generate_marketing_project_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.project_number := 'MKT-PRJ-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('marketing_project_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-numbering
CREATE TRIGGER set_job_request_number
  BEFORE INSERT ON public.marketing_job_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_request_number();

CREATE TRIGGER set_marketing_task_number
  BEFORE INSERT ON public.marketing_tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_marketing_task_number();

CREATE TRIGGER set_marketing_project_number
  BEFORE INSERT ON public.marketing_projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_marketing_project_number();

-- Enable RLS on all tables
ALTER TABLE public.marketing_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_task_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_social_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_credit_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users full access
CREATE POLICY "Allow authenticated read marketing_team_members" ON public.marketing_team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_team_members" ON public.marketing_team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_team_members" ON public.marketing_team_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_team_members" ON public.marketing_team_members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_task_categories" ON public.marketing_task_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_task_categories" ON public.marketing_task_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_task_categories" ON public.marketing_task_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_task_categories" ON public.marketing_task_categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_projects" ON public.marketing_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_projects" ON public.marketing_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_projects" ON public.marketing_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_projects" ON public.marketing_projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_job_requests" ON public.marketing_job_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_job_requests" ON public.marketing_job_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_job_requests" ON public.marketing_job_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_job_requests" ON public.marketing_job_requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_tasks" ON public.marketing_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_tasks" ON public.marketing_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_tasks" ON public.marketing_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_tasks" ON public.marketing_tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_task_assignees" ON public.marketing_task_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_task_assignees" ON public.marketing_task_assignees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_task_assignees" ON public.marketing_task_assignees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_task_assignees" ON public.marketing_task_assignees FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_task_feedback" ON public.marketing_task_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_task_feedback" ON public.marketing_task_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_task_feedback" ON public.marketing_task_feedback FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_task_feedback" ON public.marketing_task_feedback FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_social_accounts" ON public.marketing_social_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_social_accounts" ON public.marketing_social_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_social_accounts" ON public.marketing_social_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_social_accounts" ON public.marketing_social_accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_social_stats" ON public.marketing_social_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_social_stats" ON public.marketing_social_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_social_stats" ON public.marketing_social_stats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_social_stats" ON public.marketing_social_stats FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read marketing_credit_settings" ON public.marketing_credit_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert marketing_credit_settings" ON public.marketing_credit_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update marketing_credit_settings" ON public.marketing_credit_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete marketing_credit_settings" ON public.marketing_credit_settings FOR DELETE TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX idx_marketing_tasks_status ON public.marketing_tasks(status);
CREATE INDEX idx_marketing_tasks_company ON public.marketing_tasks(company_id);
CREATE INDEX idx_marketing_tasks_project ON public.marketing_tasks(project_id);
CREATE INDEX idx_marketing_job_requests_status ON public.marketing_job_requests(status);
CREATE INDEX idx_marketing_task_assignees_member ON public.marketing_task_assignees(member_id);
CREATE INDEX idx_marketing_social_accounts_company ON public.marketing_social_accounts(company_id);