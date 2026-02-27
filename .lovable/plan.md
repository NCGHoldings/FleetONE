
# Comprehensive Reconciliation Database Migration

This migration creates the missing reconciliation tables, adds clearing/line-item tables for the upgraded AR/AP worksheets, builds a centralized audit logging system, adds performance indexes, and ensures `updated_at` triggers on all new tables -- all following "Secure by Default" principles.

---

## What Already Exists (No Changes Needed)

| Table | Status |
|-------|--------|
| `bank_reconciliations` | Exists with RLS |
| `bank_reconciliation_items` | Exists with RLS |
| `ar_reconciliations` | Exists with RLS |
| `ap_reconciliations` | Exists with RLS |
| `accounting_audit_log` | Exists (basic audit) |
| `petty_cash_funds` | Exists |
| `petty_cash_transactions` | Exists |

---

## New Tables to Create

### 1. `ar_reconciliation_items` (clearing line items for SAP-style AR worksheet)

Tracks which AR invoices/receipts were cleared during a reconciliation session.

- `id` UUID PK
- `reconciliation_id` UUID FK -> `ar_reconciliations(id)` ON DELETE CASCADE
- `source_type` TEXT (invoice, receipt, credit_note, debit_note)
- `source_id` UUID (reference to `ar_invoices` or `ar_receipts`)
- `doc_number` TEXT
- `doc_date` DATE
- `debit_amount` NUMERIC DEFAULT 0
- `credit_amount` NUMERIC DEFAULT 0
- `cleared` BOOLEAN DEFAULT false
- `cleared_amount` NUMERIC DEFAULT 0
- `remarks` TEXT
- `cleared_at` TIMESTAMPTZ
- `cleared_by` UUID
- `company_id` UUID FK -> `companies(id)`
- `created_at` TIMESTAMPTZ DEFAULT now()

### 2. `ap_reconciliation_items` (clearing line items for SAP-style AP worksheet)

Same pattern for vendor/AP clearing.

- `id` UUID PK
- `reconciliation_id` UUID FK -> `ap_reconciliations(id)` ON DELETE CASCADE
- `source_type` TEXT (invoice, payment, debit_note, credit_note)
- `source_id` UUID
- `doc_number` TEXT
- `doc_date` DATE
- `debit_amount` NUMERIC DEFAULT 0
- `credit_amount` NUMERIC DEFAULT 0
- `cleared` BOOLEAN DEFAULT false
- `cleared_amount` NUMERIC DEFAULT 0
- `remarks` TEXT
- `cleared_at` TIMESTAMPTZ
- `cleared_by` UUID
- `company_id` UUID FK -> `companies(id)`
- `created_at` TIMESTAMPTZ DEFAULT now()

### 3. `petty_cash_reconciliations`

Physical cash count reconciliation against system balance.

- `id` UUID PK
- `fund_id` UUID FK -> `petty_cash_funds(id)` ON DELETE CASCADE
- `reconciliation_date` DATE NOT NULL
- `system_balance` NUMERIC NOT NULL DEFAULT 0
- `physical_count` NUMERIC NOT NULL DEFAULT 0
- `difference` NUMERIC GENERATED ALWAYS AS (physical_count - system_balance) STORED
- `status` TEXT DEFAULT 'draft'
- `notes` TEXT
- `reconciled_by` UUID
- `reconciled_at` TIMESTAMPTZ
- `company_id` UUID FK -> `companies(id)`
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 4. `petty_cash_reconciliation_items`

Line items for petty cash reconciliation (denomination breakdown, adjustments).

- `id` UUID PK
- `reconciliation_id` UUID FK -> `petty_cash_reconciliations(id)` ON DELETE CASCADE
- `transaction_id` UUID FK -> `petty_cash_transactions(id)` ON DELETE SET NULL
- `description` TEXT
- `amount` NUMERIC DEFAULT 0
- `cleared` BOOLEAN DEFAULT false
- `remarks` TEXT
- `company_id` UUID FK -> `companies(id)`
- `created_at` TIMESTAMPTZ DEFAULT now()

### 5. `subledger_reconciliations`

AR/AP sub-ledger vs GL control account reconciliation.

- `id` UUID PK
- `reconciliation_type` TEXT NOT NULL (ar, ap)
- `reconciliation_date` DATE NOT NULL
- `subledger_total` NUMERIC NOT NULL DEFAULT 0
- `gl_balance` NUMERIC NOT NULL DEFAULT 0
- `difference` NUMERIC GENERATED ALWAYS AS (subledger_total - gl_balance) STORED
- `gl_account_id` UUID FK -> `chart_of_accounts(id)`
- `status` TEXT DEFAULT 'draft'
- `notes` TEXT
- `details` JSONB (per-customer/vendor breakdown)
- `reconciled_by` UUID
- `reconciled_at` TIMESTAMPTZ
- `company_id` UUID FK -> `companies(id)`
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

### 6. `intercompany_reconciliations`

Cross-company balance reconciliation between NCG sub-units.

- `id` UUID PK
- `unit_a_id` UUID FK -> `companies(id)`
- `unit_b_id` UUID FK -> `companies(id)`
- `reconciliation_date` DATE NOT NULL
- `unit_a_balance` NUMERIC NOT NULL DEFAULT 0
- `unit_b_balance` NUMERIC NOT NULL DEFAULT 0
- `difference` NUMERIC GENERATED ALWAYS AS (unit_a_balance - unit_b_balance) STORED
- `status` TEXT DEFAULT 'draft'
- `notes` TEXT
- `details` JSONB (transaction-level breakdown)
- `reconciled_by` UUID
- `reconciled_at` TIMESTAMPTZ
- `company_id` UUID FK -> `companies(id)`
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

---

## Security: RLS Policies

All 6 new tables get RLS enabled with role-based policies following the existing pattern:

- **SELECT**: All authenticated users can view (`auth.uid() IS NOT NULL`)
- **INSERT/UPDATE/DELETE**: Restricted to `finance`, `admin`, `super_admin` roles using the existing `has_role()` security definer function
- Uses `(SELECT auth.uid())` pattern for performance (avoids re-evaluation per row)

---

## Performance: Indexes

B-tree indexes on all FK columns and common WHERE clause columns:

| Table | Indexed Columns |
|-------|----------------|
| `ar_reconciliation_items` | reconciliation_id, source_id, company_id |
| `ap_reconciliation_items` | reconciliation_id, source_id, company_id |
| `petty_cash_reconciliations` | fund_id, company_id, reconciliation_date |
| `petty_cash_reconciliation_items` | reconciliation_id, transaction_id |
| `subledger_reconciliations` | company_id, reconciliation_type, gl_account_id |
| `intercompany_reconciliations` | unit_a_id, unit_b_id, company_id |

GIN indexes on `details` JSONB columns in `subledger_reconciliations` and `intercompany_reconciliations`.

---

## Audit Logging

Create a centralized audit trigger function `audit.log_changes()` in a private `audit` schema that:
- Captures `INSERT`, `UPDATE`, `DELETE` operations
- Stores `user_id` (from `auth.uid()`), `table_name`, `record_id`, `action`, `old_data`, `new_data`, `timestamp`
- Attach this trigger to all 6 new reconciliation tables
- Leverages the existing `accounting_audit_log` table structure (no new audit table needed -- we reuse it)

---

## Reliability: updated_at Triggers

A shared `set_updated_at()` function (create if not exists) applied as BEFORE UPDATE triggers on:
- `petty_cash_reconciliations`
- `subledger_reconciliations`
- `intercompany_reconciliations`

(The item tables don't have `updated_at` columns since they are append-only clearing records.)

---

## Migration Execution Order

1. Create `audit` schema (if not exists)
2. Create shared helper functions (`set_updated_at`, `audit_reconciliation_changes`)
3. Create all 6 tables with proper constraints and defaults
4. Enable RLS on all tables
5. Create role-based RLS policies
6. Create all B-tree and GIN indexes
7. Attach `updated_at` triggers
8. Attach audit triggers to all 6 tables

No existing tables are modified -- this is purely additive.
