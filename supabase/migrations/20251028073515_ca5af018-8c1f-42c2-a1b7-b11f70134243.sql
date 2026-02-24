-- Create governance calendar tables

-- Create custom types
CREATE TYPE frequency_rule_type AS ENUM (
  'DAILY',
  'WEEKLY_BY_WEEKDAY',
  'BIWEEKLY_BY_WEEKDAY',
  'MONTHLY_BY_DAY',
  'MONTHLY_NTH_WEEKDAY',
  'MONTH_END',
  'RELATIVE_WINDOW',
  'ADHOC'
);

CREATE TYPE submission_rule_type AS ENUM (
  'SAME_AS_FREQUENCY',
  'FIXED_DAY_EACH_MONTH',
  'SAME_WEEKDAY',
  'FOLLOWING_MONTH_DAY_N',
  'INCLUDED_IN_OTHER',
  'NONE'
);

CREATE TYPE governance_item_status AS ENUM (
  'Planned',
  'Due',
  'Submitted',
  'Completed',
  'Skipped',
  'N/A'
);

CREATE TYPE governance_item_type AS ENUM (
  'REPORT',
  'EVENT'
);

CREATE TYPE notification_type AS ENUM (
  'REMINDER_3_DAY',
  'REMINDER_TODAY',
  'OVERDUE'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed'
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_company_id UUID REFERENCES companies(id),
  sector TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Strategic Business Units table
CREATE TABLE sbus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Frequency rules table
CREATE TABLE frequency_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type frequency_rule_type NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submission rules table
CREATE TABLE submission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type submission_rule_type NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Governance items table
CREATE TABLE governance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type governance_item_type NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sbu_id UUID REFERENCES sbus(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  frequency_rule_id UUID NOT NULL REFERENCES frequency_rules(id),
  submission_rule_id UUID REFERENCES submission_rules(id),
  location TEXT,
  notes TEXT,
  status governance_item_status DEFAULT 'Planned',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Governance occurrences table
CREATE TABLE governance_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES governance_items(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  original_rule_text TEXT,
  is_holiday_adjusted BOOLEAN DEFAULT false,
  manual_override BOOLEAN DEFAULT false,
  status governance_item_status DEFAULT 'Planned',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_by_engine_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, scheduled_date)
);

-- Governance audit log table
CREATE TABLE governance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID REFERENCES governance_occurrences(id) ON DELETE CASCADE,
  item_id UUID REFERENCES governance_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Governance notifications table
CREATE TABLE governance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL REFERENCES governance_occurrences(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  notification_type notification_type NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status notification_status DEFAULT 'pending'
);

-- User company access table
CREATE TABLE user_company_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- Extend holidays table
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Public';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'LK';

-- Create indexes for performance
CREATE INDEX idx_governance_items_company ON governance_items(company_id);
CREATE INDEX idx_governance_items_sbu ON governance_items(sbu_id);
CREATE INDEX idx_governance_items_frequency ON governance_items(frequency_rule_id);
CREATE INDEX idx_governance_occurrences_item ON governance_occurrences(item_id);
CREATE INDEX idx_governance_occurrences_date ON governance_occurrences(scheduled_date);
CREATE INDEX idx_governance_occurrences_status ON governance_occurrences(status);
CREATE INDEX idx_governance_audit_occurrence ON governance_audit_log(occurrence_id);
CREATE INDEX idx_governance_audit_item ON governance_audit_log(item_id);
CREATE INDEX idx_sbus_company ON sbus(company_id);
CREATE INDEX idx_user_company_access_user ON user_company_access(user_id);
CREATE INDEX idx_user_company_access_company ON user_company_access(company_id);

-- RLS Policies

-- Companies: viewable by authenticated users, manageable by admins
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view companies"
  ON companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage companies"
  ON companies FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'governance_admin'::app_role));

-- SBUs: viewable by authenticated users, manageable by admins
ALTER TABLE sbus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view SBUs"
  ON sbus FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage SBUs"
  ON sbus FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'governance_admin'::app_role));

-- Frequency rules: viewable by authenticated users, manageable by admins
ALTER TABLE frequency_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view frequency rules"
  ON frequency_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage frequency rules"
  ON frequency_rules FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'governance_admin'::app_role));

-- Submission rules: viewable by authenticated users, manageable by admins
ALTER TABLE submission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view submission rules"
  ON submission_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage submission rules"
  ON submission_rules FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'governance_admin'::app_role));

-- Governance items: scoped by company access
ALTER TABLE governance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all governance items"
  ON governance_items FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'governance_admin'::app_role)
  );

CREATE POLICY "Managers see their company items"
  ON governance_items FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all items"
  ON governance_items FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'governance_admin'::app_role)
  );

CREATE POLICY "Managers can manage their company items"
  ON governance_items FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'governance_manager'::app_role) AND
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND can_edit = true
    )
  );

CREATE POLICY "Managers can update their company items"
  ON governance_items FOR UPDATE
  USING (
    has_role(auth.uid(), 'governance_manager'::app_role) AND
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND can_edit = true
    )
  );

-- Governance occurrences: scoped by item's company
ALTER TABLE governance_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all occurrences"
  ON governance_occurrences FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'governance_admin'::app_role)
  );

CREATE POLICY "Users see occurrences for their companies"
  ON governance_occurrences FOR SELECT
  USING (
    item_id IN (
      SELECT id FROM governance_items 
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all occurrences"
  ON governance_occurrences FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'governance_admin'::app_role)
  );

CREATE POLICY "Managers can manage their company occurrences"
  ON governance_occurrences FOR ALL
  USING (
    item_id IN (
      SELECT id FROM governance_items 
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid() AND can_edit = true
      )
    )
  );

-- Governance audit log: viewable by users with company access
ALTER TABLE governance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their companies"
  ON governance_audit_log FOR SELECT
  USING (
    item_id IN (
      SELECT id FROM governance_items 
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
    ) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'governance_admin'::app_role)
  );

CREATE POLICY "System can create audit logs"
  ON governance_audit_log FOR INSERT
  WITH CHECK (true);

-- Governance notifications: viewable by admins
ALTER TABLE governance_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
  ON governance_notifications FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'governance_admin'::app_role)
  );

CREATE POLICY "System can create notifications"
  ON governance_notifications FOR INSERT
  WITH CHECK (true);

-- User company access: users see their own access
ALTER TABLE user_company_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company access"
  ON user_company_access FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage company access"
  ON user_company_access FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'governance_admin'::app_role));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_governance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_governance_updated_at();

CREATE TRIGGER update_sbus_updated_at
  BEFORE UPDATE ON sbus
  FOR EACH ROW
  EXECUTE FUNCTION update_governance_updated_at();

CREATE TRIGGER update_governance_items_updated_at
  BEFORE UPDATE ON governance_items
  FOR EACH ROW
  EXECUTE FUNCTION update_governance_updated_at();

CREATE TRIGGER update_governance_occurrences_updated_at
  BEFORE UPDATE ON governance_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_governance_updated_at();