

# Fix: Add Force Replace Option for COA Upload

## Problem
You accidentally used Merge mode, resulting in 456 accounts instead of the desired 222. Replace mode is blocked because 88 journal entry lines and other references are linked to existing accounts. You need a way to clean everything and start fresh with only 222 accounts.

## Solution
Add a **"Force Replace"** capability that first deletes all linked financial data (journal entries, budget items, bank account links, etc.) for the selected company, then deletes all COA accounts, then inserts the new 222 accounts. This requires an explicit confirmation step with a typed confirmation to prevent accidental data loss.

## Changes to: `src/components/accounting/ChartOfAccountsUpload.tsx`

### 1. Add a "Force Replace" button when Replace is blocked
When linked data is detected and Replace is blocked, show an additional option:
- **"Force Replace (Clear All Linked Data)"** button with a red destructive style
- Clicking it opens a confirmation dialog requiring the user to type "CONFIRM" to proceed
- Clear warning text listing exactly what will be deleted (88 journal lines, 0 budget items, etc.)

### 2. Implement `handleForceReplace` function
This new function will:
1. Delete all `journal_entry_lines` linked to the company's COA accounts (chunked by account IDs)
2. Delete the parent `journal_entries` for those lines
3. Delete `budget_line_items` linked to COA accounts
4. Clear `gl_account_id` on `bank_accounts` for the company (set to null, not delete the bank accounts)
5. Delete `ap_invoice_lines` and `ar_invoice_lines` linked to COA accounts
6. Clear COA references in `accounts_payable`, `accounts_receivable`
7. Clear COA references in `asset_categories` and `auto_posting_rules`
8. Delete all `chart_of_accounts` for the company
9. Insert the 222 new accounts
10. Log to `coa_upload_history` with notes like `force_replace: deleted X linked records, inserted 222 accounts`

### 3. Confirmation UI
- Add state: `showForceConfirm` (boolean), `confirmText` (string)
- When "Force Replace" is clicked, show an inline confirmation area:
  - Red warning: "This will permanently delete ALL journal entries, budget items, and other financial data linked to this company's chart of accounts. This cannot be undone."
  - Text input: "Type CONFIRM to proceed"
  - "Force Replace" button (destructive, enabled only when text matches "CONFIRM")
  - "Cancel" button

### 4. Deletion order (respecting FK constraints)
```text
1. journal_entry_lines (child of journal_entries, references account_id)
2. journal_entries (parent, by company_id)
3. budget_line_items (references account_id)
4. ap_invoice_lines (references account_id)
5. ar_invoice_lines (references account_id)
6. auto_posting_rules (references debit/credit_account_id) - by company_id
7. asset_categories (references asset/depreciation/expense_account_id) - set nulls
8. bank_accounts - SET gl_account_id = null (don't delete bank accounts)
9. gl_settings - clear account references (set nulls)
10. chart_of_accounts - DELETE all for company_id
11. INSERT new 222 accounts
```

### 5. Progress tracking
Show a multi-step progress indicator during force replace:
- "Clearing journal entries..." 
- "Clearing budget items..."
- "Clearing other references..."
- "Deleting old accounts..."
- "Inserting new accounts..."

## Expected Result
- User clicks "Force Replace", types "CONFIRM", and the system cleanly removes all 456 accounts and their 88 linked journal lines
- 222 new accounts are inserted fresh
- Audit log records the force replace action
- No more duplicate key errors

