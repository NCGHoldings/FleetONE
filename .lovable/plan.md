

# Fix Bank Account Form and Add COA Edit Functionality

## Change 1: Make Bank Name and Account Number Optional for Petty Cash

When "Petty Cash" is selected as the Account Type in the Bank Account form, the "Bank Name" and "Account Number" fields should no longer be mandatory since petty cash doesn't belong to a bank.

**File:** `src/components/accounting/BankAccountForm.tsx`

- Change the Zod schema to use `.superRefine()` so that `bank_name` and `account_number` are only required when `account_type` is NOT `petty_cash`
- Update the form labels to show the asterisk (*) conditionally based on the selected account type
- Watch `account_type` and adjust validation dynamically

## Change 2: Add Edit Functionality to COA

Currently the COA table view has placeholder Edit/Delete buttons that do nothing, and the tree view has no edit option at all.

### 2a: Create an AccountEditForm component

**New file:** `src/components/accounting/AccountEditForm.tsx`

- Similar to `AccountForm.tsx` but pre-populated with existing account data
- Fields: account_code, account_name, account_type, parent_account_id, is_header, description, is_active
- Uses a new `useCompanyUpdateAccount` mutation hook

### 2b: Add update mutation hook

**File:** `src/hooks/useCompanyMutations.ts`

- Add `useCompanyUpdateAccount` mutation that updates `chart_of_accounts` by ID
- Supports updating: account_code, account_name, account_type, description, is_header, is_active, parent_account_id, and level fields
- Invalidates the same query keys as the create mutation

### 2c: Wire up Edit button in table view

**File:** `src/components/accounting/ChartOfAccountsView.tsx`

- Add state for the currently editing account
- Make the Edit button in the actions column open a Dialog with `AccountEditForm`
- Pass the selected account data and a refetch callback

### 2d: Add Edit button in tree view

**File:** `src/components/accounting/ChartOfAccountsTree.tsx`

- Add an Edit (pencil) icon button next to each leaf account row (alongside the existing Plus button)
- Clicking it opens a Dialog with `AccountEditForm` pre-filled with the account data
- Import `Edit` icon from lucide-react (already imported in `ChartOfAccountsView`)

---

## Technical Summary

| File | Change |
|------|--------|
| `BankAccountForm.tsx` | Conditional validation for petty cash |
| `AccountEditForm.tsx` (new) | Edit form component for COA accounts |
| `useCompanyMutations.ts` | Add `useCompanyUpdateAccount` hook |
| `ChartOfAccountsView.tsx` | Wire Edit button in table to open edit dialog |
| `ChartOfAccountsTree.tsx` | Add Edit button per account row with edit dialog |

