-- Migration: Enforce Strict Database-Level Tenant Isolation
-- Description: Adds database triggers to prevent cross-tenant foreign key linkages 
-- (e.g. linking a Live Bank Account to a Test GL Account).

-- 1. SEVER CORRUPTED LINKS FIRST
-- Nullify any gl_account_id on bank_accounts where the company_id does not match the chart_of_accounts company_id
UPDATE bank_accounts ba
SET gl_account_id = NULL
FROM chart_of_accounts coa
WHERE ba.gl_account_id = coa.id
  AND ba.company_id != coa.company_id;

-- Note: We are skipping journal_entry_lines cleanup here because account_id cannot be NULL.
-- Any existing cross-linked journal entry lines must be manually re-mapped to a valid GL account in the correct company.

-- 2. CREATE TENANT ISOLATION TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION check_tenant_isolation_bank_accounts()
RETURNS TRIGGER AS $$
DECLARE
  v_foreign_company_id UUID;
BEGIN
  IF NEW.gl_account_id IS NOT NULL THEN
    SELECT company_id INTO v_foreign_company_id FROM chart_of_accounts WHERE id = NEW.gl_account_id;
    IF v_foreign_company_id != NEW.company_id THEN
      RAISE EXCEPTION 'TENANT ISOLATION BREACH: Attempted to link a GL Account (Tenant: %) to a Bank Account (Tenant: %). Access Denied.', v_foreign_company_id, NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_tenant_isolation_jel()
RETURNS TRIGGER AS $$
DECLARE
  v_foreign_company_id UUID;
  v_coa_company_id UUID;
BEGIN
  IF NEW.account_id IS NOT NULL THEN
    SELECT je.company_id INTO v_foreign_company_id FROM journal_entries je WHERE je.id = NEW.journal_entry_id;
    SELECT company_id INTO v_coa_company_id FROM chart_of_accounts WHERE id = NEW.account_id;
    IF v_coa_company_id != v_foreign_company_id THEN
      RAISE EXCEPTION 'TENANT ISOLATION BREACH: Attempted to use a GL Account (Tenant: %) in a Journal Entry (Tenant: %). Access Denied.', v_coa_company_id, v_foreign_company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. APPLY TRIGGERS
DROP TRIGGER IF EXISTS trg_enforce_tenant_isolation_bank_accounts ON bank_accounts;
CREATE TRIGGER trg_enforce_tenant_isolation_bank_accounts
BEFORE INSERT OR UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION check_tenant_isolation_bank_accounts();

DROP TRIGGER IF EXISTS trg_enforce_tenant_isolation_journal_entry_lines ON journal_entry_lines;
CREATE TRIGGER trg_enforce_tenant_isolation_journal_entry_lines
BEFORE INSERT OR UPDATE ON journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION check_tenant_isolation_jel();
