
# Upload and Replace Chart of Accounts for NCG Holding

## Current Behavior

The "Upload COA" button **already has replace functionality** built in. When you upload a new COA file, it:
1. Deletes ALL existing accounts for the selected company
2. Inserts the new accounts from the uploaded file

## Problem: Data Integrity Risk

There are **700 journal entry lines** and **113 budget line items** that reference existing COA account IDs. If the old accounts are deleted and new ones inserted, those references become **orphaned** (pointing to non-existent accounts), which would break:
- Journal Entry views and General Ledger reports
- Budget analytics
- Any historical financial data

## Proposed Solution: Safe Replace with Confirmation

### Changes to `src/components/accounting/ChartOfAccountsUpload.tsx`

1. **Add a confirmation step** before uploading that warns the user about the replacement
2. **Show existing account count and linked transaction count** so the user understands the impact
3. **Add a "Replace Mode" toggle** with two options:
   - **Replace All (Clean Slate)**: Deletes existing COA and uploads new one. Shows a warning if there are linked journal entries/budget items that will lose their account references
   - **Merge/Update**: Matches accounts by GL code -- updates existing accounts and adds new ones without deleting (preserves transaction links)

4. **Pre-upload validation**: Before confirming, query the database for:
   - Count of existing accounts for this company
   - Count of journal entry lines referencing these accounts
   - Count of budget line items referencing these accounts

5. **Clear warning dialog** when linked data exists:
   > "Warning: There are 700 journal entries and 113 budget items linked to the current COA. Replacing will orphan these references. Consider using Merge mode instead."

### Technical Details

**New state variables:**
- `replaceMode: 'replace' | 'merge'` (default: 'replace')
- `existingStats: { accounts: number, journalLines: number, budgetLines: number } | null`

**Pre-upload check function** (runs when preview is shown):
```text
Query existing account count for company
Query journal_entry_lines count where account_id in company's COA
Query budget_line_items count where account_id in company's COA
Display results in an Alert
```

**Merge mode logic:**
- For each parsed row, check if an account with the same `gl_code` already exists for this company
- If exists: update `account_name`, `level1-5`, `account_type`, `account_level` fields
- If new: insert as a new account
- Accounts in the old COA but NOT in the new file are left untouched (no deletion)

**Replace mode logic (existing, with added confirmation):**
- Show a red warning alert with transaction counts
- Require explicit confirmation ("I understand this will affect X transactions")
- Then proceed with current delete-and-insert logic

### Also Fix: Build Errors

The following pre-existing build errors will be fixed alongside this feature:

- **`AssetMaintenanceView.tsx`**: Add missing `useState` declarations for `selectedLog`, `completionCost`, `completionNotes`, and `setSelectedLog`/`setCompletionNotes`/`setCompletionCost`. Fix references to non-existent hooks `useCreateMaintenanceLog` and `useFixedAssets`.
- **`ExpenseReviewView.tsx`**: Add missing `toast` import from `sonner`. Fix `auto_post_on_approve` type access by casting the GL settings value.
- **`BudgetAnalytics.tsx`**: Replace `account_id` with the correct property name from the `BudgetLineItem` type.
- **`CoreGLSettings.tsx`**: Fix `companyName` property access and `gl_settings` type errors by using proper type casting for Supabase queries.
- **`ModuleFinanceSettingsView.tsx`**: Fix upsert type error for `module_finance_settings`.
- **`EnhancedTripStatusManagementModal.tsx` and `PostTripAdjustmentModal.tsx`**: Fix `NCG_HOLDING_ID` export reference.
- **`useAccountingMutations.ts`**: Fix `gl_settings` query type errors and property access issues by adding proper type assertions.
- **`useCommissionFinance.ts`**: Fix settings type cast.
