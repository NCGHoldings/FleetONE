-- =====================================================
-- Module-to-Finance Integration Mapping System
-- =====================================================

-- Create module_gl_mappings table for configuring how operational data flows to GL
CREATE TABLE public.module_gl_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL, -- 'school_bus', 'special_hire', 'yutong', 'sinotruck', 'light_vehicle', 'ncg_express'
  transaction_type TEXT NOT NULL, -- 'revenue', 'expense', 'receivable', 'payable'
  event_name TEXT NOT NULL, -- Human-readable name: 'Student Fee Payment', 'Trip Expense', etc.
  source_table TEXT NOT NULL, -- Database table: 'school_payments', 'daily_trips', etc.
  amount_field TEXT NOT NULL DEFAULT 'amount', -- Column name for amount
  date_field TEXT DEFAULT 'created_at', -- Column name for transaction date
  reference_field TEXT, -- Column for reference number
  description_template TEXT, -- Template: 'School Bus Fee - {student_name}'
  debit_account_id UUID REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  auto_post BOOLEAN DEFAULT false, -- Automatically create journal entry
  requires_approval BOOLEAN DEFAULT false, -- Require approval before posting
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_module_gl_mappings_company ON public.module_gl_mappings(company_id);
CREATE INDEX idx_module_gl_mappings_source ON public.module_gl_mappings(source_table, company_id);
CREATE INDEX idx_module_gl_mappings_module ON public.module_gl_mappings(module_name, company_id);

-- Create gl_posting_log to track which operational records have been posted
CREATE TABLE public.gl_posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL, -- Original table name
  source_record_id UUID NOT NULL, -- Original record ID
  mapping_id UUID REFERENCES public.module_gl_mappings(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  posted_amount DECIMAL(15,2) NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT now(),
  posted_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'posted', -- 'posted', 'pending', 'failed', 'reversed'
  error_message TEXT,
  notes TEXT,
  UNIQUE(source_table, source_record_id) -- Prevent duplicate postings
);

-- Create index for faster lookups
CREATE INDEX idx_gl_posting_log_source ON public.gl_posting_log(source_table, source_record_id);
CREATE INDEX idx_gl_posting_log_company ON public.gl_posting_log(company_id);
CREATE INDEX idx_gl_posting_log_status ON public.gl_posting_log(status);
CREATE INDEX idx_gl_posting_log_journal ON public.gl_posting_log(journal_entry_id);

-- Create pending_gl_postings view for unposted transactions
CREATE TABLE public.pending_gl_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mapping_id UUID REFERENCES public.module_gl_mappings(id),
  source_table TEXT NOT NULL,
  source_record_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  debit_account_id UUID REFERENCES public.chart_of_accounts(id),
  credit_account_id UUID REFERENCES public.chart_of_accounts(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'posted'
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  UNIQUE(source_table, source_record_id)
);

CREATE INDEX idx_pending_gl_postings_company ON public.pending_gl_postings(company_id);
CREATE INDEX idx_pending_gl_postings_status ON public.pending_gl_postings(status);

-- Enable RLS on all tables
ALTER TABLE public.module_gl_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_posting_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_gl_postings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_gl_mappings
CREATE POLICY "Users can view module_gl_mappings for their company"
  ON public.module_gl_mappings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE id = company_id
    )
  );

CREATE POLICY "Finance roles can manage module_gl_mappings"
  ON public.module_gl_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance', 'admin', 'super_admin')
    )
  );

-- RLS Policies for gl_posting_log
CREATE POLICY "Users can view gl_posting_log for their company"
  ON public.gl_posting_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE id = company_id
    )
  );

CREATE POLICY "Finance roles can manage gl_posting_log"
  ON public.gl_posting_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance', 'admin', 'super_admin')
    )
  );

-- RLS Policies for pending_gl_postings
CREATE POLICY "Users can view pending_gl_postings for their company"
  ON public.pending_gl_postings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE id = company_id
    )
  );

CREATE POLICY "Finance roles can manage pending_gl_postings"
  ON public.pending_gl_postings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('finance', 'admin', 'super_admin')
    )
  );

-- Create function to auto-post to GL based on mapping rules
CREATE OR REPLACE FUNCTION public.process_gl_posting(
  p_source_table TEXT,
  p_source_record_id UUID,
  p_company_id UUID,
  p_amount DECIMAL,
  p_transaction_date DATE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mapping RECORD;
  v_journal_entry_id UUID;
  v_entry_number TEXT;
  v_description TEXT;
BEGIN
  -- Find active mapping for this source table and company
  SELECT * INTO v_mapping
  FROM public.module_gl_mappings
  WHERE source_table = p_source_table
    AND company_id = p_company_id
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No active mapping found for table % and company %', p_source_table, p_company_id;
    RETURN NULL;
  END IF;
  
  -- Check if already posted
  IF EXISTS (
    SELECT 1 FROM public.gl_posting_log 
    WHERE source_table = p_source_table 
    AND source_record_id = p_source_record_id
  ) THEN
    RAISE NOTICE 'Record already posted to GL';
    RETURN NULL;
  END IF;
  
  -- Build description
  v_description := COALESCE(p_description, v_mapping.description_template, 'Auto-posted from ' || p_source_table);
  
  -- If auto_post is enabled, create journal entry directly
  IF v_mapping.auto_post AND v_mapping.debit_account_id IS NOT NULL AND v_mapping.credit_account_id IS NOT NULL THEN
    -- Generate entry number
    SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
           LPAD((COUNT(*) + 1)::TEXT, 4, '0')
    INTO v_entry_number
    FROM public.journal_entries 
    WHERE company_id = p_company_id 
    AND DATE(created_at) = CURRENT_DATE;
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
      company_id, 
      entry_number, 
      entry_date, 
      description, 
      total_debit,
      total_credit,
      status
    ) VALUES (
      p_company_id,
      v_entry_number,
      p_transaction_date,
      v_description,
      p_amount,
      p_amount,
      'posted'
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Create debit line
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, 
      account_id, 
      debit, 
      credit,
      description,
      company_id
    ) VALUES (
      v_journal_entry_id,
      v_mapping.debit_account_id,
      p_amount,
      0,
      v_description || ' (Debit)',
      p_company_id
    );
    
    -- Create credit line
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, 
      account_id, 
      debit,
      credit, 
      description,
      company_id
    ) VALUES (
      v_journal_entry_id,
      v_mapping.credit_account_id,
      0,
      p_amount,
      v_description || ' (Credit)',
      p_company_id
    );
    
    -- Log the posting
    INSERT INTO public.gl_posting_log (
      company_id,
      source_table, 
      source_record_id, 
      mapping_id,
      journal_entry_id, 
      posted_amount,
      posted_by,
      status
    ) VALUES (
      p_company_id,
      p_source_table, 
      p_source_record_id, 
      v_mapping.id,
      v_journal_entry_id, 
      p_amount,
      auth.uid(),
      'posted'
    );
    
    RETURN v_journal_entry_id;
  ELSE
    -- Add to pending queue for manual posting
    INSERT INTO public.pending_gl_postings (
      company_id,
      mapping_id,
      source_table,
      source_record_id,
      transaction_date,
      description,
      amount,
      debit_account_id,
      credit_account_id,
      status
    ) VALUES (
      p_company_id,
      v_mapping.id,
      p_source_table,
      p_source_record_id,
      p_transaction_date,
      v_description,
      p_amount,
      v_mapping.debit_account_id,
      v_mapping.credit_account_id,
      'pending'
    ) ON CONFLICT (source_table, source_record_id) DO NOTHING;
    
    RETURN NULL;
  END IF;
END;
$$;

-- Create function to manually post from pending queue
CREATE OR REPLACE FUNCTION public.post_pending_gl_entry(p_pending_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending RECORD;
  v_journal_entry_id UUID;
  v_entry_number TEXT;
BEGIN
  -- Get pending record
  SELECT * INTO v_pending
  FROM public.pending_gl_postings
  WHERE id = p_pending_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending posting not found or already processed';
  END IF;
  
  -- Validate accounts are set
  IF v_pending.debit_account_id IS NULL OR v_pending.credit_account_id IS NULL THEN
    RAISE EXCEPTION 'Debit and Credit accounts must be configured';
  END IF;
  
  -- Generate entry number
  SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
         LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO v_entry_number
  FROM public.journal_entries 
  WHERE company_id = v_pending.company_id 
  AND DATE(created_at) = CURRENT_DATE;
  
  -- Create journal entry
  INSERT INTO public.journal_entries (
    company_id, 
    entry_number, 
    entry_date, 
    description, 
    total_debit,
    total_credit,
    status
  ) VALUES (
    v_pending.company_id,
    v_entry_number,
    v_pending.transaction_date,
    v_pending.description,
    v_pending.amount,
    v_pending.amount,
    'posted'
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Create debit line
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, 
    account_id, 
    debit, 
    credit,
    description,
    company_id
  ) VALUES (
    v_journal_entry_id,
    v_pending.debit_account_id,
    v_pending.amount,
    0,
    v_pending.description || ' (Debit)',
    v_pending.company_id
  );
  
  -- Create credit line
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, 
    account_id, 
    debit,
    credit, 
    description,
    company_id
  ) VALUES (
    v_journal_entry_id,
    v_pending.credit_account_id,
    0,
    v_pending.amount,
    v_pending.description || ' (Credit)',
    v_pending.company_id
  );
  
  -- Log the posting
  INSERT INTO public.gl_posting_log (
    company_id,
    source_table, 
    source_record_id, 
    mapping_id,
    journal_entry_id, 
    posted_amount,
    posted_by,
    status
  ) VALUES (
    v_pending.company_id,
    v_pending.source_table, 
    v_pending.source_record_id, 
    v_pending.mapping_id,
    v_journal_entry_id, 
    v_pending.amount,
    auth.uid(),
    'posted'
  );
  
  -- Update pending status
  UPDATE public.pending_gl_postings
  SET status = 'posted', approved_by = auth.uid(), approved_at = now()
  WHERE id = p_pending_id;
  
  RETURN v_journal_entry_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_gl_posting TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_pending_gl_entry TO authenticated;