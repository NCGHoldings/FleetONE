
# Fix Accounting Module Issues

## Issues Identified

### Issue 1: Cannot Add COA Account
The "Add Account" button in `ChartOfAccountsView.tsx` has no `onClick` handler - it's just a static button that does nothing when clicked.

**Root Cause**: No dialog/form is connected to the button.

### Issue 2: company_id Not Being Saved for New Accounts
The `useCompanyCreateAccount` mutation in `useCompanyMutations.ts` does NOT include `company_id` in the insert statement, even though it's required for multi-company isolation.

**Current Code (Line 580-589)**:
```typescript
.insert([{ 
  account_code: account.account_code,
  account_name: account.account_name,
  account_type: account.account_type,
  parent_account_id: account.parent_account_id,
  is_header: account.is_header,
  description: account.description,
  is_active: true,
  current_balance: 0,
  // company_id is MISSING!
} as any])
```

### Issue 3: GL Search Not Working
The DataTable search in `JournalEntriesView.tsx` is configured with `searchKey="description"`, which should work. However, the search box only renders if:
- `customSearch` is NOT provided, AND
- `onDateRangeChange` is NOT provided, AND  
- `searchKey` IS provided

Looking at line 173-188 in `data-table.tsx`, the conditions are correct for JournalEntriesView. The search box should appear and filter by description. This may be a visual issue if the search input doesn't look clickable or the column accessor is mismatched.

## Fixes Required

### Fix 1: Create Account Form Dialog
Create a new component `AccountForm.tsx` with fields for:
- Account Code
- Account Name
- Account Type (dropdown: asset, liability, equity, revenue, expense)
- Parent Account (optional dropdown)
- Is Header Account (checkbox)
- Description

### Fix 2: Connect Add Account Button to Form
Update `ChartOfAccountsView.tsx` to:
1. Import the new AccountForm
2. Add state for dialog open/close
3. Wrap the button in a Dialog component

### Fix 3: Fix company_id in useCompanyCreateAccount
Update the mutation to include the `company_id` field in the insert.

### Fix 4: Add getEffectiveCompanyId for COA (Consolidated GL Support)
For the consolidated GL architecture, new accounts should use `getEffectiveCompanyId()` so sub-companies' accounts go to the parent company.

---

## Implementation Plan

### Step 1: Create AccountForm Component

**New File: `src/components/accounting/AccountForm.tsx`**

A form dialog with:
- Form fields for account details
- Uses `useCompanyCreateAccount` mutation
- Parent account selector using `useChartOfAccounts` (filtered to header accounts)
- Validation using zod

### Step 2: Update ChartOfAccountsView

**File: `src/components/accounting/ChartOfAccountsView.tsx`**

Changes:
1. Add Dialog import and state
2. Wrap "Add Account" button in Dialog trigger
3. Import and render AccountForm in DialogContent

### Step 3: Fix useCompanyCreateAccount Mutation

**File: `src/hooks/useCompanyMutations.ts`**

Changes:
1. Import `useCompany` hook
2. Get `getEffectiveCompanyId` for consolidated GL support
3. Include `company_id: effectiveCompanyId` in the insert statement

### Step 4: Verify GL Search Functionality

The DataTable search uses TanStack Table's built-in column filtering. The issue may be that the search input is conditionally hidden or the column accessor doesn't match.

**File: `src/components/accounting/JournalEntriesView.tsx`**

Check that:
- `searchKey="description"` matches the column accessor
- No `customSearch` or `onDateRangeChange` props are passed (which would hide the basic search)

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/components/accounting/AccountForm.tsx` | Create | New form component for adding accounts |
| `src/components/accounting/ChartOfAccountsView.tsx` | Modify | Connect Add Account button to dialog |
| `src/hooks/useCompanyMutations.ts` | Modify | Add company_id to insert statement |

---

## Technical Details

### AccountForm.tsx Schema
```typescript
const accountSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  account_name: z.string().min(1, "Account name is required"),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  parent_account_id: z.string().optional(),
  is_header: z.boolean().default(false),
  description: z.string().optional(),
});
```

### Fixed Mutation Insert
```typescript
const effectiveCompanyId = getEffectiveCompanyId();

const { data, error } = await supabase
  .from("chart_of_accounts")
  .insert([{ 
    account_code: account.account_code,
    account_name: account.account_name,
    account_type: account.account_type,
    parent_account_id: account.parent_account_id,
    is_header: account.is_header,
    description: account.description,
    is_active: true,
    current_balance: 0,
    company_id: effectiveCompanyId, // FIX: Include company_id
  } as any])
  .select()
  .single();
```

### ChartOfAccountsView Dialog Pattern
```typescript
const [showAccountForm, setShowAccountForm] = useState(false);

// In JSX:
<Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Account
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add New Account</DialogTitle>
    </DialogHeader>
    <AccountForm onSuccess={() => setShowAccountForm(false)} />
  </DialogContent>
</Dialog>
```
