

# Fix: Restrict Level 1 COA and Require Parent Account

## Problem
The "Add Account" form allows creating new top-level (Level 1) accounts via "No Parent (Top Level)". Level 1 should be locked to only the 6 standard categories: Assets, Liabilities, Equity, Revenue, Cost of Sales, Expenditure. Any new account must be created under one of these.

The screenshot shows an account "COMMERCIAL BANK C/A" (code 1300101211) sitting at the wrong level — likely created without a proper parent.

## Fix

### In `src/components/accounting/AccountForm.tsx`:

1. **Remove "No Parent (Top Level)" option** — make parent account **required** (not optional)
2. **Change parent_account_id** from `z.string().optional()` to `z.string().min(1, "Parent account is required")` and remove the `_none` default
3. **Remove the `_none` SelectItem** from the parent dropdown
4. **Filter parent accounts** to only show header accounts or accounts that logically can have children (exclude leaf transaction accounts if desired — or keep all for flexibility)
5. **Auto-derive account_type** from the selected parent instead of manual selection — this prevents mismatches (e.g., creating an "asset" under a liability parent)

### Validation changes:
- Parent account is mandatory — no Level 1 creation allowed
- Account type auto-set from parent's type (remove manual type selector or make it read-only)

### Files to modify
- **`src/components/accounting/AccountForm.tsx`** — require parent, remove "No Parent", auto-derive type from parent

### Result
- Users can only add accounts under existing hierarchy
- No new Level 1 categories can be created
- Account type always matches parent's type
- Prevents orphaned/misplaced accounts like the one in the screenshot

