
Root cause is now clear from the live request trace:

1) The failing requests are plain INSERTs to `chart_of_accounts` (409 duplicate key), not merge upserts.
2) In the modal screenshot, **Replace All** is selected (red button: “Replace with 222 Accounts”).
3) `handleUploadReplace` currently does:
   - try delete existing COA
   - if delete fails, it only logs the error
   - still continues with insert batches
   - insert then fails with duplicate unique key (`chart_of_accounts_company_account_code_key`)
4) There are linked records for this company (at least `journal_entry_lines` and `bank_accounts`), so delete is expected to fail.

I will fix this so the user never gets the “0 success, 222 errors” loop again.

## Implementation plan

### 1) Make Replace mode fail-safe (stop immediately on delete failure)
File: `src/components/accounting/ChartOfAccountsUpload.tsx`

- In `handleUploadReplace`, change delete handling to **hard-stop**:
  - if `deleteError` exists, throw/return immediately
  - do not continue to insert loop
- Show a clear toast with actionable guidance:
  - “Replace cannot run because existing accounts are linked to transactions/settings. Use Merge/Update mode.”
- Populate `uploadStats` with a meaningful failure state instead of batch-level duplicate spam.

Why: This removes the misleading 222 duplicate errors and surfaces the real problem directly.

---

### 2) Prevent unsafe Replace attempts in the UI
File: `src/components/accounting/ChartOfAccountsUpload.tsx`

- When linked data exists:
  - disable or strongly gate Replace mode (cannot proceed destructively)
  - auto-switch to merge if user tries to upload in replace with links
- Keep Replace mode available only when no links are detected.

Why: Users should not be able to trigger a known-failing destructive path for active companies.

---

### 3) Fix inaccurate link counting used in warning text
File: `src/components/accounting/ChartOfAccountsUpload.tsx`

- Correct budget relation query column:
  - from `chart_of_accounts_id` (wrong) to `account_id` (actual FK)
- Improve linked-data detection accuracy so warning text is trustworthy.
- Keep message generic enough to include non-journal dependencies (bank accounts/settings/etc), since multiple FK tables can block delete.

Why: Current warning underreports impact and can mislead users into attempting Replace.

---

### 4) Improve user guidance in modal copy
File: `src/components/accounting/ChartOfAccountsUpload.tsx`

- Update Replace help text:
  - explain that active companies usually must use Merge
  - Replace is for clean setups with no references
- Keep “Merge / Update (Recommended)” as the safe primary path.

Why: Reduces repeated operator mistakes and support churn.

## Validation plan

1) Reproduce current scenario (company with linked records, 222-file import):
   - selecting Replace should no longer proceed to inserts after failed delete
   - user should see one clear actionable error
2) Run Merge mode with same file:
   - should complete without unique constraint failures
3) Test a company with no linked references:
   - Replace should complete successfully
4) Confirm no regression to COA history logging and progress UI.

## Expected outcome

- No more “Uploaded 0 accounts with 222 errors” for linked companies.
- Clear explanation when Replace is blocked.
- Users can complete updates reliably via Merge/Update.
- Safer COA maintenance aligned with existing accounting data integrity.
