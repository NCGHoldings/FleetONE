-- =====================================================================
-- Migration: Bank Reconciliation Pattern Learning (Level 5)
-- Purpose: Store GL account mapping patterns learned from user actions
--          during reconciliation Quick Add. Enables auto-suggestion
--          for recurring transactions.
-- =====================================================================

-- Table to store learned patterns
CREATE TABLE IF NOT EXISTS bank_reconciliation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  -- Pattern matching fields
  description_pattern TEXT NOT NULL,        -- e.g., 'Deyana Lyon%' or 'FUND TRANSFER%'
  reference_pattern TEXT,                   -- e.g., 'LEA%' or '099'
  -- Suggested GL account
  gl_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  transaction_type TEXT DEFAULT 'deposit',  -- 'deposit' or 'payment'
  -- Learning metadata
  confidence_count INT DEFAULT 1,           -- how many times this pattern was used
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Ensure unique patterns per company+bank
  UNIQUE(company_id, bank_account_id, description_pattern, transaction_type)
);

-- Enable RLS
ALTER TABLE bank_reconciliation_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view reconciliation patterns for their tenant"
  ON bank_reconciliation_patterns FOR SELECT
  USING (can_access_tenant_record(company_id));

CREATE POLICY "Users can insert reconciliation patterns"
  ON bank_reconciliation_patterns FOR INSERT
  WITH CHECK (can_access_tenant_record(company_id));

CREATE POLICY "Users can update reconciliation patterns"
  ON bank_reconciliation_patterns FOR UPDATE
  USING (can_access_tenant_record(company_id));

-- Index for fast pattern lookups
CREATE INDEX IF NOT EXISTS idx_recon_patterns_lookup
  ON bank_reconciliation_patterns(company_id, bank_account_id, description_pattern);

CREATE INDEX IF NOT EXISTS idx_recon_patterns_confidence
  ON bank_reconciliation_patterns(company_id, confidence_count DESC);
