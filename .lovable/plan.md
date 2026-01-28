
# Fix: AccountForm for 5-Level COA Structure

## Issues Found

### 1. Parent Account Dropdown Nearly Empty
The current form only shows header accounts (`is_header = true`) as parent options, but only 2 accounts in the entire COA have this flag set. Most accounts should be potential parents.

**Solution:** Modify the parent account query to show ALL accounts (not just headers) so users can select any account as a parent.

### 2. Missing Level Fields for Tree Display
The COA upload populates these critical fields:
- `level1` through `level5` - Hierarchical category names
- `account_level` - Which level (1-5) the account is at
- `gl_code` - The GL code

The AccountForm doesn't populate any of these, so new accounts won't appear correctly in the tree view.

**Solution:** Add logic to automatically derive these fields based on:
- The selected parent account (inherit its level structure)
- Set appropriate account_level and determine if it's a header

### 3. Controlled/Uncontrolled Warning
The parent account Select has `value={field.value || ""}` which causes React warnings.

**Solution:** Always use consistent value handling with the "_none" placeholder.

---

## Implementation

### File: `src/components/accounting/AccountForm.tsx`

**Changes:**

1. **Update parent account query** - Fetch ALL accounts (remove `is_header = true` filter) and include level information

2. **Add level derivation logic** - When saving:
   - If parent selected: inherit parent's level1-level4, put account name in next level
   - If no parent: this is a top-level account, put name in level1
   - Set `account_level` based on which level is populated
   - Determine `is_header` automatically (accounts with children or explicitly marked)

3. **Fix Select controlled/uncontrolled issue** - Use `value={field.value ?? "_none"}` consistently

4. **Update mutation data** - Include all level fields in the insert

---

## Technical Details

### Level Derivation Logic

When a parent is selected:
```typescript
// Example: Parent account has level1="ASSETS", level2="CURRENT ASSETS", level3="CASH"
// New account "Petty Cash" will get:
{
  level1: "ASSETS",      // Inherited from parent
  level2: "CURRENT ASSETS", // Inherited from parent
  level3: "CASH",        // Inherited from parent
  level4: "Petty Cash",  // New account name goes in next available level
  level5: null,
  account_level: 4,
  is_header: false       // Leaf accounts are not headers by default
}
```

### Updated Parent Query
```typescript
// Fetch ALL accounts with level info for parent selection
const { data: parentAccounts } = useQuery({
  queryKey: ["chart-of-accounts-all", selectedCompanyId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name, level1, level2, level3, level4, level5, account_level")
      .eq("company_id", selectedCompanyId)
      .order("account_code");
    
    if (error) throw error;
    return data;
  },
  enabled: !!selectedCompanyId,
});
```

### Updated Insert Data
```typescript
const insertData = {
  account_code: data.account_code,
  account_name: data.account_name,
  account_type: data.account_type,
  parent_account_id: parentId,
  is_header: data.is_header,
  description: data.description,
  is_active: true,
  current_balance: 0,
  company_id: companyId,
  // New level fields:
  level1: derivedLevels.level1,
  level2: derivedLevels.level2,
  level3: derivedLevels.level3,
  level4: derivedLevels.level4,
  level5: derivedLevels.level5,
  account_level: derivedLevels.accountLevel,
  gl_code: data.account_code,
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/accounting/AccountForm.tsx` | Update parent query, add level derivation, fix Select value |
| `src/hooks/useCompanyMutations.ts` | Add level fields to insert statement |

---

## Testing Steps

After implementation:

1. Open Chart of Accounts
2. Click "Add Account"
3. Verify parent dropdown shows all accounts (not just headers)
4. Select a parent account (e.g., under CASH category)
5. Fill in account code, name, type
6. Click "Create Account"
7. Verify the new account appears in the correct position in the tree view
8. Verify the account has proper level1-level5 values in the database
