-- Create budget_templates table
CREATE TABLE public.budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  industry_type TEXT NOT NULL,
  description TEXT,
  template_structure JSONB NOT NULL DEFAULT '{}',
  is_system_template BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_name TEXT NOT NULL,
  budget_code TEXT UNIQUE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  budget_period TEXT NOT NULL CHECK (budget_period IN ('annual', 'quarterly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  template_id UUID REFERENCES public.budget_templates(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'closed')),
  total_budget_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'LKR',
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  version_number INTEGER DEFAULT 1,
  parent_budget_id UUID REFERENCES public.budgets(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_locked BOOLEAN DEFAULT false
);

-- Create budget_departments table
CREATE TABLE public.budget_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  department_code TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  parent_department_id UUID REFERENCES public.budget_departments(id),
  allocated_amount NUMERIC DEFAULT 0,
  spent_amount NUMERIC DEFAULT 0,
  variance_amount NUMERIC GENERATED ALWAYS AS (spent_amount - allocated_amount) STORED,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create budget_line_items table
CREATE TABLE public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.budget_departments(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  category TEXT NOT NULL,
  subcategory TEXT,
  line_item_name TEXT NOT NULL,
  description TEXT,
  budget_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  variance_amount NUMERIC GENERATED ALWAYS AS (actual_amount - budget_amount) STORED,
  variance_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN budget_amount = 0 THEN 0
      ELSE ((actual_amount - budget_amount) / budget_amount * 100)
    END
  ) STORED,
  period_type TEXT DEFAULT 'annual',
  monthly_allocation JSONB DEFAULT '{}',
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create budget_approvals table
CREATE TABLE public.budget_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_level INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create budget_revisions table
CREATE TABLE public.budget_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  revised_by UUID NOT NULL REFERENCES auth.users(id),
  revision_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revision_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sequence for budget codes
CREATE SEQUENCE IF NOT EXISTS public.budget_code_seq START 1;

-- Function to generate budget code
CREATE OR REPLACE FUNCTION public.generate_budget_code(p_fiscal_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('public.budget_code_seq');
  RETURN 'BDG-' || p_fiscal_year || '-' || LPAD(seq_val::TEXT, 3, '0');
END;
$$;

-- Function to set budget code
CREATE OR REPLACE FUNCTION public.set_budget_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.budget_code IS NULL OR NEW.budget_code = '' THEN
    NEW.budget_code = public.generate_budget_code(NEW.fiscal_year);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for budget code
CREATE TRIGGER set_budget_code_trigger
BEFORE INSERT ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.set_budget_code();

-- Function to update budget totals
CREATE OR REPLACE FUNCTION public.update_budget_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.budgets
  SET total_budget_amount = (
    SELECT COALESCE(SUM(budget_amount), 0)
    FROM public.budget_line_items
    WHERE budget_id = COALESCE(NEW.budget_id, OLD.budget_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.budget_id, OLD.budget_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for budget totals
CREATE TRIGGER update_budget_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.budget_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_budget_totals();

-- Function to update department totals
CREATE OR REPLACE FUNCTION public.update_department_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.budget_departments
  SET 
    allocated_amount = (
      SELECT COALESCE(SUM(budget_amount), 0)
      FROM public.budget_line_items
      WHERE department_id = COALESCE(NEW.department_id, OLD.department_id)
    ),
    spent_amount = (
      SELECT COALESCE(SUM(actual_amount), 0)
      FROM public.budget_line_items
      WHERE department_id = COALESCE(NEW.department_id, OLD.department_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.department_id, OLD.department_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for department totals
CREATE TRIGGER update_department_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.budget_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_department_totals();

-- Updated_at triggers
CREATE TRIGGER update_budget_templates_updated_at
BEFORE UPDATE ON public.budget_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_departments_updated_at
BEFORE UPDATE ON public.budget_departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at
BEFORE UPDATE ON public.budget_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_templates
CREATE POLICY "Anyone can view active templates"
ON public.budget_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Finance and admins can manage templates"
ON public.budget_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- RLS Policies for budgets
CREATE POLICY "Users can view budgets they created or are assigned to"
ON public.budgets FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Finance and admins can manage budgets"
ON public.budgets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- RLS Policies for budget_departments
CREATE POLICY "Users can view departments in accessible budgets"
ON public.budget_departments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_departments.budget_id
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'finance')
      )
    )
  )
);

CREATE POLICY "Finance and admins can manage departments"
ON public.budget_departments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- RLS Policies for budget_line_items
CREATE POLICY "Users can view line items in accessible budgets"
ON public.budget_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_line_items.budget_id
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'finance')
      )
    )
  )
);

CREATE POLICY "Finance and admins can manage line items"
ON public.budget_line_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- RLS Policies for budget_approvals
CREATE POLICY "Users can view approvals for their budgets"
ON public.budget_approvals FOR SELECT
USING (
  approver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

CREATE POLICY "Finance and admins can manage approvals"
ON public.budget_approvals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- RLS Policies for budget_revisions
CREATE POLICY "Users can view revisions for accessible budgets"
ON public.budget_revisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_revisions.budget_id
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'finance')
      )
    )
  )
);

CREATE POLICY "Finance and admins can manage revisions"
ON public.budget_revisions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'finance')
  )
);

-- Create indexes
CREATE INDEX idx_budgets_fiscal_year ON public.budgets(fiscal_year);
CREATE INDEX idx_budgets_status ON public.budgets(status);
CREATE INDEX idx_budgets_created_by ON public.budgets(created_by);
CREATE INDEX idx_budget_departments_budget_id ON public.budget_departments(budget_id);
CREATE INDEX idx_budget_line_items_budget_id ON public.budget_line_items(budget_id);
CREATE INDEX idx_budget_line_items_department_id ON public.budget_line_items(department_id);
CREATE INDEX idx_budget_approvals_budget_id ON public.budget_approvals(budget_id);
CREATE INDEX idx_budget_approvals_approver_id ON public.budget_approvals(approver_id);