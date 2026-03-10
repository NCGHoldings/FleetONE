
-- ============================================================
-- COMPREHENSIVE RECONCILIATION DATABASE MIGRATION
-- Secure by Default | High Performance | Audit Logging
-- ============================================================

-- 1. Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. Shared helper: set_updated_at (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Audit trigger function (writes to existing accounting_audit_log)
CREATE OR REPLACE FUNCTION audit.log_reconciliation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id TEXT;
  v_old JSONB := NULL;
  v_new JSONB := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
    v_old := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::TEXT;
    v_new := to_jsonb(NEW);
  ELSE
    v_record_id := NEW.id::TEXT;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  END IF;

  INSERT INTO public.accounting_audit_log (
    action, table_name, record_id, old_values, new_values,
    changed_by, changed_at, company_id
  ) VALUES (
    TG_OP, TG_TABLE_NAME, v_record_id, v_old, v_new,
    (SELECT auth.uid()), now(),
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.company_id
      ELSE NEW.company_id
    END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ============================================================
-- TABLE 1: ar_reconciliation_items
-- ============================================================
CREATE TABLE public.ar_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.ar_reconciliations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  doc_number TEXT,
  doc_date DATE,
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  cleared BOOLEAN NOT NULL DEFAULT false,
  cleared_amount NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  cleared_at TIMESTAMPTZ,
  cleared_by UUID,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ar_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_recon_items_select" ON public.ar_reconciliation_items
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "ar_recon_items_insert" ON public.ar_reconciliation_items
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "ar_recon_items_update" ON public.ar_reconciliation_items
  FOR UPDATE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "ar_recon_items_delete" ON public.ar_reconciliation_items
  FOR DELETE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE INDEX idx_ar_recon_items_recon_id ON public.ar_reconciliation_items(reconciliation_id);
CREATE INDEX idx_ar_recon_items_source_id ON public.ar_reconciliation_items(source_id);
CREATE INDEX idx_ar_recon_items_company_id ON public.ar_reconciliation_items(company_id);

CREATE TRIGGER trg_audit_ar_recon_items
  AFTER INSERT OR UPDATE OR DELETE ON public.ar_reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION audit.log_reconciliation_changes();

-- ============================================================
-- TABLE 2: ap_reconciliation_items
-- ============================================================
CREATE TABLE public.ap_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.ap_reconciliations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  doc_number TEXT,
  doc_date DATE,
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  cleared BOOLEAN NOT NULL DEFAULT false,
  cleared_amount NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  cleared_at TIMESTAMPTZ,
  cleared_by UUID,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ap_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ap_recon_items_select" ON public.ap_reconciliation_items
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "ap_recon_items_insert" ON public.ap_reconciliation_items
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "ap_recon_items_update" ON public.ap_reconciliation_items
  FOR UPDATE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "ap_recon_items_delete" ON public.ap_reconciliation_items
  FOR DELETE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE INDEX idx_ap_recon_items_recon_id ON public.ap_reconciliation_items(reconciliation_id);
CREATE INDEX idx_ap_recon_items_source_id ON public.ap_reconciliation_items(source_id);
CREATE INDEX idx_ap_recon_items_company_id ON public.ap_reconciliation_items(company_id);

CREATE TRIGGER trg_audit_ap_recon_items
  AFTER INSERT OR UPDATE OR DELETE ON public.ap_reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION audit.log_reconciliation_changes();

-- ============================================================
-- TABLE 3: petty_cash_reconciliations
-- ============================================================
CREATE TABLE public.petty_cash_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.petty_cash_funds(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  system_balance NUMERIC NOT NULL DEFAULT 0,
  physical_count NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC GENERATED ALWAYS AS (physical_count - system_balance) STORED,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.petty_cash_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_recon_select" ON public.petty_cash_reconciliations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "pc_recon_insert" ON public.petty_cash_reconciliations
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "pc_recon_update" ON public.petty_cash_reconciliations
  FOR UPDATE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "pc_recon_delete" ON public.petty_cash_reconciliations
  FOR DELETE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE INDEX idx_pc_recon_fund_id ON public.petty_cash_reconciliations(fund_id);
CREATE INDEX idx_pc_recon_company_id ON public.petty_cash_reconciliations(company_id);
CREATE INDEX idx_pc_recon_date ON public.petty_cash_reconciliations(reconciliation_date);

CREATE TRIGGER trg_updated_at_pc_recon
  BEFORE UPDATE ON public.petty_cash_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_audit_pc_recon
  AFTER INSERT OR UPDATE OR DELETE ON public.petty_cash_reconciliations
  FOR EACH ROW EXECUTE FUNCTION audit.log_reconciliation_changes();

-- ============================================================
-- TABLE 4: petty_cash_reconciliation_items
-- ============================================================
CREATE TABLE public.petty_cash_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.petty_cash_reconciliations(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.petty_cash_transactions(id) ON DELETE SET NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  cleared BOOLEAN NOT NULL DEFAULT false,
  remarks TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.petty_cash_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_recon_items_select" ON public.petty_cash_reconciliation_items
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "pc_recon_items_insert" ON public.petty_cash_reconciliation_items
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "pc_recon_items_update" ON public.petty_cash_reconciliation_items
  FOR UPDATE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "pc_recon_items_delete" ON public.petty_cash_reconciliation_items
  FOR DELETE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE INDEX idx_pc_recon_items_recon_id ON public.petty_cash_reconciliation_items(reconciliation_id);
CREATE INDEX idx_pc_recon_items_txn_id ON public.petty_cash_reconciliation_items(transaction_id);

CREATE TRIGGER trg_audit_pc_recon_items
  AFTER INSERT OR UPDATE OR DELETE ON public.petty_cash_reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION audit.log_reconciliation_changes();

-- ============================================================
-- TABLE 5: subledger_reconciliations
-- ============================================================
CREATE TABLE public.subledger_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_type TEXT NOT NULL,
  reconciliation_date DATE NOT NULL,
  subledger_total NUMERIC NOT NULL DEFAULT 0,
  gl_balance NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC GENERATED ALWAYS AS (subledger_total - gl_balance) STORED,
  gl_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  details JSONB,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subledger_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_recon_select" ON public.subledger_reconciliations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "sl_recon_insert" ON public.subledger_reconciliations
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "sl_recon_update" ON public.subledger_reconciliations
  FOR UPDATE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "sl_recon_delete" ON public.subledger_reconciliations
  FOR DELETE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE INDEX idx_sl_recon_company_id ON public.subledger_reconciliations(company_id);
CREATE INDEX idx_sl_recon_type ON public.subledger_reconciliations(reconciliation_type);
CREATE INDEX idx_sl_recon_gl_account ON public.subledger_reconciliations(gl_account_id);
CREATE INDEX idx_sl_recon_details ON public.subledger_reconciliations USING GIN(details);

CREATE TRIGGER trg_updated_at_sl_recon
  BEFORE UPDATE ON public.subledger_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_audit_sl_recon
  AFTER INSERT OR UPDATE OR DELETE ON public.subledger_reconciliations
  FOR EACH ROW EXECUTE FUNCTION audit.log_reconciliation_changes();

-- ============================================================
-- TABLE 6: intercompany_reconciliations
-- ============================================================
CREATE TABLE public.intercompany_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_a_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_b_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  unit_a_balance NUMERIC NOT NULL DEFAULT 0,
  unit_b_balance NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC GENERATED ALWAYS AS (unit_a_balance - unit_b_balance) STORED,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  details JSONB,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intercompany_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ic_recon_select" ON public.intercompany_reconciliations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "ic_recon_insert" ON public.intercompany_reconciliations
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "ic_recon_update" ON public.intercompany_reconciliations
  FOR UPDATE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );
CREATE POLICY "ic_recon_delete" ON public.intercompany_reconciliations
  FOR DELETE TO authenticated USING (
    public.has_role((SELECT auth.uid()), 'finance') OR
    public.has_role((SELECT auth.uid()), 'admin') OR
    public.has_role((SELECT auth.uid()), 'super_admin')
  );

CREATE INDEX idx_ic_recon_unit_a ON public.intercompany_reconciliations(unit_a_id);
CREATE INDEX idx_ic_recon_unit_b ON public.intercompany_reconciliations(unit_b_id);
CREATE INDEX idx_ic_recon_company_id ON public.intercompany_reconciliations(company_id);
CREATE INDEX idx_ic_recon_details ON public.intercompany_reconciliations USING GIN(details);

CREATE TRIGGER trg_updated_at_ic_recon
  BEFORE UPDATE ON public.intercompany_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_audit_ic_recon
  AFTER INSERT OR UPDATE OR DELETE ON public.intercompany_reconciliations
  FOR EACH ROW EXECUTE FUNCTION audit.log_reconciliation_changes();
