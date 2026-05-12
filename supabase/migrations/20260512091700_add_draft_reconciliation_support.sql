-- ============================================================
-- Migration: Add Draft Reconciliation Support
-- Purpose: Support persistent "draft" reconciliation state so
--          cleared/matched items survive browser refresh.
-- ============================================================

-- 1. Add matched_transaction_id to bank_reconciliation_items
--    This stores the cross-side match (e.g. statement item matched to book item)
ALTER TABLE bank_reconciliation_items
  ADD COLUMN IF NOT EXISTS matched_transaction_id UUID REFERENCES bank_transactions(id);

-- 2. Add metadata columns to bank_reconciliations for draft state
ALTER TABLE bank_reconciliations
  ADD COLUMN IF NOT EXISTS statement_no TEXT,
  ADD COLUMN IF NOT EXISTS draft_statement_balance NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

-- 3. Create index for fast draft lookup per bank account
CREATE INDEX IF NOT EXISTS idx_bank_recon_draft_lookup
  ON bank_reconciliations(bank_account_id, status)
  WHERE status = 'draft';

-- 4. Create index on reconciliation_items for fast item fetch
CREATE INDEX IF NOT EXISTS idx_bank_recon_items_recon_id
  ON bank_reconciliation_items(reconciliation_id);
