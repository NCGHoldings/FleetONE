
Issue diagnosis (confirmed from live DB + screenshots)

- Do I know what the issue is? Yes.
- The current Force Replace RPC (`force_delete_coa_for_company`) is failing before COA deletion because it tries to delete `journal_entries` directly.
- In NCG Holding right now:
  - COA rows: 456
  - Linked `journal_entry_lines`: 126
  - Company `journal_entries`: 62
  - Child rows referencing those journal entries include at least:
    - `special_hire_payments.journal_entry_id`: 3 rows
    - `ar_receipts.journal_entry_id`: 1 row
- So this statement in the function is unsafe:
  - `DELETE FROM journal_entries WHERE company_id = p_company_id;`
  - because many child tables reference `journal_entries` with `NO ACTION`.
- There are also additional function correctness issues that will fail next even after this first fix:
  - `gl_settings` table is referenced in the function but does not exist in this DB.
  - `leasing_finance_settings` update uses non-existent column `ar_account_id`.
  - The function currently misses several real COA-FK tables/columns (e.g. `special_hire_finance_settings`, `yutong_finance_settings`, proper `leasing_finance_settings` columns, etc.).
- This is why you are stuck in repeated error loops.

Implementation plan

1) Rewrite the database RPC to be schema-driven and constraint-safe  
File: `supabase/migrations/<new_timestamp>_fix_force_delete_coa_for_company.sql`

- Replace `force_delete_coa_for_company` with a robust version that:
  1. Collects `v_account_ids` for the target company.
  2. Collects `v_journal_ids` for the target company.
  3. Deletes `journal_entry_lines` by `account_id` first.
  4. Clears `journal_entries` children before deleting parent journal entries:
     - Iterate FK metadata from `pg_constraint` where parent is `journal_entries`.
     - For each child FK column:
       - Attempt `UPDATE child SET fk_col = NULL WHERE fk_col = ANY(v_journal_ids)`.
       - If NULL is disallowed, fallback to `DELETE child WHERE fk_col = ANY(v_journal_ids)` (Force mode is destructive by design).
     - Then delete company `journal_entries`.
  5. Clears all `chart_of_accounts` children using FK metadata (instead of hardcoded table list):
     - Iterate FK metadata where parent is `chart_of_accounts`.
     - Handle self-reference (`chart_of_accounts.parent_account_id`) by nullifying first.
     - For each child FK:
       - Attempt NULL update first.
       - Fallback to delete when NOT NULL blocks nullification.
  6. Deletes COA for the company.
  7. Returns structured JSON summary:
     - success flag
     - deleted accounts count
     - linked rows affected count
     - per-phase counters / failing table+constraint if error

Why this fixes your loop:
- It removes brittle hardcoded assumptions.
- It handles current and future FK children automatically.
- It avoids failing on missing tables/renamed columns.

2) Improve frontend failure visibility and progress messaging  
File: `src/components/accounting/ChartOfAccountsUpload.tsx`

- Keep current RPC call, but improve error handling to show exact DB context from returned JSON:
  - failing phase
  - failing table/constraint (if provided by RPC)
- Update force-replace progress text to explicit phases:
  - clearing journal links
  - clearing COA links
  - deleting old COA
  - inserting new 222
- Ensure upload history notes include structured failure reason from RPC (not only raw message).

3) Fix linked-reference counters shown in modal (accuracy)  
File: `src/components/accounting/ChartOfAccountsUpload.tsx` (or new lightweight summary RPC if preferred)

- Current warning undercounts “other refs”.
- Replace limited hardcoded counting with either:
  - A new summary RPC using FK metadata, or
  - Expanded counting that includes all currently used finance settings/FK tables.
- This ensures the warning text and “other refs” value are trustworthy.

4) Keep Force Replace intentionally scoped to selected company only

- Maintain strict use of `p_company_id` for ID collection.
- All cleanup operations must filter by gathered IDs from that company, preventing accidental cross-company deletions.

Validation checklist after implementation

1. Reproduce your exact scenario (NCG Holding + Book1.csv with 222 rows):
   - Force Replace should complete without FK errors.
2. Confirm final COA count:
   - `SELECT count(*) FROM chart_of_accounts WHERE company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';`
   - expected: 222
3. Confirm uniqueness integrity:
   - no `(company_id, account_code)` duplicates.
4. Confirm upload history entry:
   - status `completed`
   - notes show force-replace counters (deleted old + inserted 222).
5. Re-open the modal:
   - linked warning/counts reflect post-reset state accurately.

Expected outcome

- No more `23503` FK crash on `special_hire_payments_journal_entry_id_fkey`.
- No more hidden follow-up crashes from stale table/column assumptions.
- NCG Holding ends with a clean 222-account COA upload successfully.
