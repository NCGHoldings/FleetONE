-- Create school payment import settings table
CREATE TABLE public.school_payment_import_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.school_branches(id) ON DELETE CASCADE,
  admission_prefixes JSONB DEFAULT '["N", "LNU"]'::jsonb,
  custom_patterns JSONB DEFAULT '[]'::jsonb,
  auto_split_siblings BOOLEAN DEFAULT true,
  default_payment_method TEXT DEFAULT 'Bank Transfer',
  min_confidence_threshold INTEGER DEFAULT 80,
  auto_approve_high_confidence BOOLEAN DEFAULT true,
  enable_pattern_learning BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(branch_id)
);

-- Create school payment imports table
CREATE TABLE public.school_payment_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.school_branches(id) ON DELETE CASCADE,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  file_name TEXT NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  auto_matched_count INTEGER DEFAULT 0,
  manual_matched_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  total_amount_imported DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create school payment import items table
CREATE TABLE public.school_payment_import_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.school_payment_imports(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  extracted_ids JSONB DEFAULT '[]'::jsonb,
  matched_student_ids JSONB DEFAULT '[]'::jsonb,
  match_status TEXT DEFAULT 'unmatched',
  match_confidence INTEGER DEFAULT 0,
  suggested_students JSONB DEFAULT '[]'::jsonb,
  payment_transaction_ids JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create school payment pattern history table
CREATE TABLE public.school_payment_pattern_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.school_branches(id) ON DELETE CASCADE,
  original_description TEXT NOT NULL,
  matched_admission_no TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'exact',
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_payment_import_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_payment_pattern_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_payment_import_settings
CREATE POLICY "Users can view import settings for their accessible branches"
  ON public.school_payment_import_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage import settings"
  ON public.school_payment_import_settings FOR ALL
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for school_payment_imports
CREATE POLICY "Users can view imports for their branches"
  ON public.school_payment_imports FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create imports"
  ON public.school_payment_imports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update imports"
  ON public.school_payment_imports FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for school_payment_import_items
CREATE POLICY "Users can view import items"
  ON public.school_payment_import_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage import items"
  ON public.school_payment_import_items FOR ALL
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for school_payment_pattern_history
CREATE POLICY "Users can view pattern history"
  ON public.school_payment_pattern_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage pattern history"
  ON public.school_payment_pattern_history FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_payment_imports_branch ON public.school_payment_imports(branch_id);
CREATE INDEX idx_payment_import_items_import ON public.school_payment_import_items(import_id);
CREATE INDEX idx_payment_import_items_status ON public.school_payment_import_items(match_status);
CREATE INDEX idx_pattern_history_branch ON public.school_payment_pattern_history(branch_id);

-- Create updated_at triggers
CREATE TRIGGER update_school_payment_import_settings_updated_at
  BEFORE UPDATE ON public.school_payment_import_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_payment_imports_updated_at
  BEFORE UPDATE ON public.school_payment_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_payment_import_items_updated_at
  BEFORE UPDATE ON public.school_payment_import_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_payment_pattern_history_updated_at
  BEFORE UPDATE ON public.school_payment_pattern_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();