-- ═══════════════════════════════════════════════════════════════
-- Backfill bank_transactions.company_id from bank_accounts
-- 
-- Many bank_transactions were created without company_id (from
-- Quick Add in Bank Reconciliation, legacy manual entries, and
-- older import flows). This causes them to be invisible in the
-- Bank Reconciliation "System Records (Book)" side, which filters
-- by company_id.
--
-- This migration inherits company_id from the parent bank_account.
-- It also backfills source_type = 'manual' for records with null
-- source_type, ensuring proper categorization in the recon split.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Backfill company_id from bank_accounts for records missing it
UPDATE bank_transactions bt
SET company_id = ba.company_id
FROM bank_accounts ba
WHERE bt.bank_account_id = ba.id
  AND bt.company_id IS NULL
  AND ba.company_id IS NOT NULL;

-- Step 2: Set source_type = 'manual' for records with null source_type
-- These are legacy manually-created entries that need proper typing
-- to appear on the correct side of the reconciliation split
UPDATE bank_transactions
SET source_type = 'manual'
WHERE source_type IS NULL;

-- Step 3: Backfill journal_entry_id for bank_transactions that were
-- created by JE posting but never got the backlink
-- Match by source_id (which points to journal_entry.id)
UPDATE bank_transactions bt
SET journal_entry_id = bt.source_id
FROM journal_entries je
WHERE bt.source_id = je.id
  AND bt.journal_entry_id IS NULL
  AND bt.source_type = 'journal_entry';
