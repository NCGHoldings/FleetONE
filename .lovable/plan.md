
# Fix: Accounting Module Issues (COA Add Account + GL Search)

## Issues Identified

### Issue 1: "Add Account" Button Does Nothing
**Location:** `ChartOfAccountsView.tsx` line 153-156

The "Add Account" button has no `onClick` handler or Dialog wrapper:
```tsx
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Account
</Button>
```

**Root Cause:** No form dialog is connected to this button.

---

### Issue 2: company_id Missing in useCompanyCreateAccount
**Location:** `useCompanyMutations.ts` lines 578-589

The mutation does NOT include `company_id` in the insert:
```tsx
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

**Root Cause:** The `companyId` variable exists (line 562) but is never used in the insert statement.

---

### Issue 3: GL Search Not Working
**Location:** `JournalEntriesView.tsx` line 219 and `data-table.tsx` lines 173-188

The DataTable search input only renders when:
1. `customSearch` is NOT provided, AND
2. `onDateRangeChange` is NOT provided, AND  
3. `searchKey` IS provided

```tsx
{!customSearch && !onDateRangeChange && searchKey && (
  <div className="relative max-w-sm">
    <Search ... />
    <Input ... />
  </div>
)}
```

Looking at JournalEntriesView:
- `searchKey="description"` is passed
- No `customSearch` or `onDateRangeChange` props

**Root Cause:** The search filters by column but TanStack Table's column filter requires the column accessor to match exactly. The "description" column uses a custom cell renderer with truncation, which could affect filtering. Let me verify the column definition matches.

The column accessor is `accessorKey: "description"` (line 96) - this should match. The search box should appear and work. The issue may be that users expect a global search rather than column-specific search.

---

## Solution

### Fix 1: Create AccountForm Component

Create a new dialog form for adding Chart of Accounts entries with fields:
- Account Code (required)
- Account Name (required)
- Account Type (dropdown: asset, liability, equity, revenue, expense)
- Parent Account (optional, for hierarchy)
- Is Header Account (checkbox)
- Description (optional)

### Fix 2: Connect Add Account Button to Dialog

Wrap the "Add Account" button in a Dialog and render the AccountForm inside.

### Fix 3: Fix company_id in useCompanyCreateAccount

Add the missing `company_id: companyId` to the insert statement.

### Fix 4: Improve GL Search

Replace the column-specific search with a global search that filters across multiple fields (Entry #, Description, etc.) for better usability.

---

## Implementation Details

### New File: `src/components/accounting/AccountForm.tsx`

A dialog form with:
- React Hook Form with zod validation
- Account type dropdown
- Parent account selector (filtered to existing accounts)
- Uses `useCompanyCreateAccount` mutation
- Success callback to close dialog and refresh list

### Changes to `src/components/accounting/ChartOfAccountsView.tsx`

1. Add state for form dialog: `const [showAccountForm, setShowAccountForm] = useState(false)`
2. Import Dialog components and AccountForm
3. Wrap "Add Account" button:
```tsx
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

### Changes to `src/hooks/useCompanyMutations.ts`

Fix the insert statement (around line 580-589):
```tsx
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
    company_id: companyId, // ADD THIS
  } as any])
```

### Changes to `src/components/accounting/JournalEntriesView.tsx`

Replace the simple `searchKey` with a custom search that filters across multiple columns:

```tsx
const [searchQuery, setSearchQuery] = useState("");

// Filter entries based on search
const filteredEntries = useMemo(() => {
  if (!entries || !searchQuery.trim()) return entries || [];
  const query = searchQuery.toLowerCase();
  return entries.filter((entry: any) => 
    entry.entry_number?.toLowerCase().includes(query) ||
    entry.description?.toLowerCase().includes(query) ||
    entry.reference?.toLowerCase().includes(query)
  );
}, [entries, searchQuery]);

// Add search input above DataTable
<Input
  placeholder="Search entries..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="max-w-sm"
/>

// Use filtered data
<DataTable
  columns={columns}
  data={filteredEntries}
/>
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/accounting/AccountForm.tsx` | Create | New form for adding COA accounts |
| `src/components/accounting/ChartOfAccountsView.tsx` | Modify | Connect Add Account button to dialog |
| `src/hooks/useCompanyMutations.ts` | Modify | Add company_id to insert statement |
| `src/components/accounting/JournalEntriesView.tsx` | Modify | Add custom search for GL entries |

---

## Testing Steps

After implementation:

1. **COA Add Account:**
   - Navigate to Accounting > Chart of Accounts
   - Click "Add Account" button
   - Verify the form dialog opens
   - Fill in account details and submit
   - Verify account appears in the list with correct company_id

2. **GL Search:**
   - Navigate to Accounting > General Ledger
   - Type in the search box
   - Verify entries are filtered by Entry #, Description, or Reference
   - Clear search and verify all entries return
