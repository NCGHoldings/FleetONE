

# Fix: COA Upload Merge Mode -- Account Code Lookup Bug

## Problem

The "Merge/Update" upload mode matches existing accounts by `gl_code`, but the unique database constraint is on `(company_id, account_code)`. Both fields are set to the same GL code value, yet the lookup only checks `gl_code`. When existing accounts have `account_code` set but `gl_code` is null or different, the system tries to INSERT instead of UPDATE, hitting the unique constraint -- causing all 222 accounts to fail.

## Will Replacing Damage Mappings?

Yes. Multiple tables have foreign key references to `chart_of_accounts.id`:
- `school_bus_finance_settings` (trade receivable, revenue, bank accounts)
- `journal_entry_lines` (account_id)
- `budget_line_items` (chart_of_accounts_id)
- GL settings for Yutong, Sinotruck, Light Vehicle, Special Hire, NCG Express

Replace mode cannot even delete the existing COA because the database blocks it with foreign key errors. The safe approach is to fix the merge mode.

## Solution

### File: `src/components/accounting/ChartOfAccountsUpload.tsx`

**Change 1 -- Fix merge lookup to use `account_code` (the field with the unique constraint)**

In `handleUploadMerge()` (lines 228-236), change the lookup from `gl_code` to `account_code`:

```typescript
// Before (broken):
const { data: existingAccounts } = await supabase
  .from("chart_of_accounts")
  .select("id, gl_code")
  .eq("company_id", companyId);

const existingByGlCode = new Map<string, string>();
(existingAccounts || []).forEach(a => {
  if (a.gl_code) existingByGlCode.set(a.gl_code, a.id);
});

// After (fixed):
const { data: existingAccounts } = await supabase
  .from("chart_of_accounts")
  .select("id, account_code, gl_code")
  .eq("company_id", companyId);

const existingByCode = new Map<string, string>();
(existingAccounts || []).forEach(a => {
  if (a.account_code) existingByCode.set(a.account_code, a.id);
  if (a.gl_code && a.gl_code !== a.account_code) existingByCode.set(a.gl_code, a.id);
});
```

Then update the lookup reference from `existingByGlCode.get(row.glCode)` to `existingByCode.get(row.glCode)`.

This ensures that accounts are matched by either `account_code` or `gl_code`, so the merge correctly updates existing accounts instead of trying to insert duplicates.

**Change 2 -- Add error logging for debugging**

In both the update and insert paths, log the actual error so users can see what went wrong in the console, making future debugging easier.

## Impact

- Merge mode will correctly match all 222 accounts to the existing 395 accounts by their GL code
- Matching accounts will be updated in-place (name, levels, type) while preserving their `id` and `current_balance`
- New accounts (codes not in the current COA) will be inserted
- All GL settings, journal entries, and budget references remain intact
- No data loss or orphaned records

