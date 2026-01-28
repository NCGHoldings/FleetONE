
# Fix: Searchable Dropdowns and Enhanced Search Across Accounting Module

## Problem Summary

The current accounting module has several search and dropdown usability issues:

1. **AccountSelector** - No search capability within the dropdown. Users must scroll through potentially hundreds of accounts to find the one they need.

2. **DataTable search** - The `searchKey` prop only filters by a single column accessor. This is limiting for users who want to search across multiple fields.

3. **Various views** have inconsistent search implementations - some work, some don't, some have search but it's column-specific.

---

## Solution Overview

Create a **Searchable Combobox pattern** for all account/entity selectors and enhance search across all major accounting views. This involves:

1. **New Component**: `SearchableAccountSelector` - A combobox with built-in search using the Command component (cmdk)
2. **Update existing views** to use consistent global search across multiple fields
3. **Ensure all dropdowns are searchable** with type-to-filter capability

---

## Implementation Details

### 1. New Searchable Account Selector Component

**File:** `src/components/accounting/shared/SearchableAccountSelector.tsx`

Create a new searchable combobox component that:
- Uses the Command (cmdk) component for fuzzy search
- Displays account code + account name
- Supports filtering by account type
- Has keyboard navigation
- Shows a search input at the top of the dropdown

```text
+----------------------------------+
|  Select account...          [v] |
+----------------------------------+
     | [Search accounts...]        |
     +-----------------------------+
     | 1101 - Cash in Hand         |
     | 1102 - Bank - BOC           |
     | 1103 - Bank - HNB           |
     | 1200 - Accounts Receivable  |
     +-----------------------------+
```

### 2. Update AccountSelector Component

**File:** `src/components/accounting/shared/AccountSelector.tsx`

Replace the simple Select with a Popover + Command combination that allows:
- Type-ahead search filtering
- Search by account code OR account name
- Keyboard navigation (arrows, enter to select)
- Clear selection option

### 3. Enhance DataTable Views with Global Search

Update the following views to implement proper multi-field search:

| View | Current State | Fix |
|------|---------------|-----|
| `ChartOfAccountsView.tsx` | Has search but only for tree view | Add search for table view too |
| `AccountsPayableView.tsx` | `searchKey="invoice_number"` | Add global search across vendor, invoice#, status |
| `AccountsReceivableView.tsx` | `searchKey="invoice_number"` | Add global search across customer, invoice#, status |
| `InventoryView.tsx` | `searchKey="item_name"` | Add global search across code, name, category |
| `VendorMasterView.tsx` | Has manual filtering | Already working, verify consistency |
| `CustomerMasterView.tsx` | Has manual filtering | Already working, verify consistency |

### 4. Specific File Changes

---

#### `src/components/accounting/shared/SearchableAccountSelector.tsx` (NEW)

Create a reusable searchable dropdown for account selection using Popover + Command:

- Props: `value`, `onValueChange`, `placeholder`, `accountTypes`, `disabled`
- Features: Built-in search, account code display, loading state
- Uses existing `useChartOfAccounts` hook

---

#### `src/components/accounting/AccountsPayableView.tsx`

Add multi-field search:

```typescript
const [searchQuery, setSearchQuery] = useState("");

// Add useMemo for filtered data
const filteredInvoices = useMemo(() => {
  if (!invoices || !searchQuery.trim()) return invoices || [];
  const query = searchQuery.toLowerCase();
  return invoices.filter((inv) =>
    inv.invoice_number?.toLowerCase().includes(query) ||
    inv.vendors?.vendor_name?.toLowerCase().includes(query) ||
    inv.vendors?.vendor_code?.toLowerCase().includes(query) ||
    inv.status?.toLowerCase().includes(query)
  );
}, [invoices, searchQuery]);
```

Add search input above DataTable and pass filtered data.

---

#### `src/components/accounting/AccountsReceivableView.tsx`

Add multi-field search (same pattern as AP):

- Search across invoice_number, customer_name, customer_code, status
- Add Input with Search icon above DataTable

---

#### `src/components/accounting/InventoryView.tsx`

Add multi-field search:

- Search across item_code, item_name, category_name, description
- Apply to both items and stock tabs

---

#### `src/components/accounting/ChartOfAccountsView.tsx`

The search already exists and works for tree view. Ensure it also filters the table view by passing filtered accounts to DataTable.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/accounting/shared/SearchableAccountSelector.tsx` | Create | New searchable combobox component |
| `src/components/accounting/AccountsPayableView.tsx` | Modify | Add global search across multiple fields |
| `src/components/accounting/AccountsReceivableView.tsx` | Modify | Add global search across multiple fields |
| `src/components/accounting/InventoryView.tsx` | Modify | Add global search for items and stock |
| `src/components/accounting/ChartOfAccountsView.tsx` | Modify | Ensure search works for table view too |

---

## Testing Steps

After implementation:

1. **Searchable Account Selector**
   - Open any form with account selection (e.g., Journal Entry Form)
   - Click the account dropdown
   - Start typing - verify accounts filter as you type
   - Verify you can search by code (e.g., "1101") or name (e.g., "Cash")
   - Select an account and verify it's properly set

2. **Accounts Payable Search**
   - Navigate to Accounts Payable
   - Type in the search box
   - Verify filtering works across invoice #, vendor name, and status
   - Clear search and verify all invoices return

3. **Accounts Receivable Search**
   - Navigate to Accounts Receivable
   - Test search across invoice #, customer name, and status

4. **Inventory Search**
   - Navigate to Inventory
   - Test search on Items tab (by code, name, category)
   - Test search on Stock tab

5. **Chart of Accounts Search**
   - Navigate to Chart of Accounts
   - Switch between Tree and Table views
   - Verify search works in both views
