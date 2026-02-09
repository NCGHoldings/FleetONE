

# Fix Bank Account Display & LKR Currency - Implementation Plan

## Problem Summary

When creating a bank account under School Bus Operations, the system shows "successfully created" but the account doesn't appear in the table. Additionally, the currency dropdown is missing LKR (Sri Lankan Rupee).

---

## Root Cause Analysis

### Issue 1: Company ID Mismatch

The bank accounts system has inconsistent company ID handling:

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT BROKEN FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  User selects: School Bus Operations (SBO)                                           │
│  ID: 0fba4a2f-598b-47e8-b863-283d00380b06                                           │
│                                                                                      │
│  1. CREATE BANK ACCOUNT                                                              │
│     └─ Uses: selectedCompanyId = SBO (0fba4a2f...)                                  │
│     └─ Saves to DB with company_id = SBO ✓                                          │
│     └─ Invalidates cache: ["bank-accounts", SBO]                                    │
│                                                                                      │
│  2. QUERY BANK ACCOUNTS                                                              │
│     └─ Uses: getEffectiveCompanyId() = NCG Holding (f40b0a9d...)  ← MISMATCH!       │
│     └─ Filters: WHERE company_id = NCG Holding                                       │
│     └─ Result: Empty (no accounts match parent company)                              │
│                                                                                      │
│  3. CACHE KEY                                                                        │
│     └─ Query uses: ["bank-accounts", NCG Holding]  ← DIFFERENT KEY!                 │
│     └─ Invalidation uses: ["bank-accounts", SBO]                                    │
│     └─ Cache never refreshes for the query                                          │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Database Evidence:**
```sql
-- Bank account created with SBO company_id
SELECT * FROM bank_accounts ORDER BY created_at DESC LIMIT 1;

company_id: 0fba4a2f-598b-47e8-b863-283d00380b06  (SBO)
account_name: "main uresha"
```

**But query filters by:**
```
company_id = f40b0a9d-ae5b-41b3-9188-535ae94c9020  (NCG Holding)
```

### Issue 2: Missing LKR Currency

The BankAccountForm has hardcoded currencies (USD, ZWL, ZAR, BWP) instead of fetching from the `currencies` table which includes LKR.

---

## Solution Architecture

For bank accounts, the correct approach is **section-specific** (not consolidated like AR/AP), because:
1. User wants "section by section should have to create bank accounts"
2. Each section may have different bank accounts for operational purposes
3. Same physical bank account can be registered under different sections if needed

### Fix Strategy

| Component | Change |
|-----------|--------|
| `useBankAccounts` | Query by `selectedCompanyId` (not `effectiveCompanyId`) |
| `useCreateBankAccount` | Insert with `selectedCompanyId` (already correct) |
| Cache invalidation | Use consistent `selectedCompanyId` for both |
| `BankAccountForm` | Fetch currencies from database, add LKR |

---

## Files to Modify

### 1. `src/hooks/useAccountingData.ts` - Fix Query Logic

**Current (broken):**
```typescript
export const useBankAccounts = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();  // Returns parent!
  
  return useQuery({
    queryKey: ["bank-accounts", effectiveCompanyId],  // Wrong key
    queryFn: async () => {
      query = query.eq("company_id", effectiveCompanyId);  // Wrong filter
    }
  });
};
```

**Fixed:**
```typescript
export const useBankAccounts = () => {
  const { selectedCompanyId } = useCompany();  // Use actual company
  
  return useQuery({
    queryKey: ["bank-accounts", selectedCompanyId],  // Correct key
    queryFn: async () => {
      query = query.eq("company_id", selectedCompanyId);  // Correct filter
    }
  });
};
```

### 2. `src/hooks/useAccountingMutations.ts` - Fix Cache Invalidation

The insert uses correct `selectedCompanyId`, but verify cache invalidation matches:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
}
```

### 3. `src/components/accounting/BankAccountForm.tsx` - Add LKR Currency

**Current (hardcoded):**
```typescript
<SelectContent>
  <SelectItem value="USD">USD</SelectItem>
  <SelectItem value="ZWL">ZWL</SelectItem>
  <SelectItem value="ZAR">ZAR</SelectItem>
  <SelectItem value="BWP">BWP</SelectItem>
</SelectContent>
```

**Fixed (fetch from DB + add common currencies including LKR):**
```typescript
// Add useCurrencies hook import
const { data: currencies } = useCurrencies();

// In the Select component
<SelectContent>
  {currencies?.map((curr) => (
    <SelectItem key={curr.currency_code} value={curr.currency_code}>
      {curr.currency_code} - {curr.currency_name}
    </SelectItem>
  ))}
  {/* Fallback common currencies */}
  {!currencies?.length && (
    <>
      <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
      <SelectItem value="USD">USD - US Dollar</SelectItem>
    </>
  )}
</SelectContent>
```

Also change default from "USD" to "LKR":
```typescript
defaultValues: {
  currency: "LKR",  // Changed from "USD"
}
```

---

## Data Flow After Fix

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           FIXED DATA FLOW                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  User selects: School Bus Operations (SBO)                                           │
│                                                                                      │
│  1. CREATE BANK ACCOUNT                                                              │
│     └─ Uses: selectedCompanyId = SBO                                                │
│     └─ Saves to DB with company_id = SBO ✓                                          │
│     └─ Invalidates cache: ["bank-accounts", SBO] ✓                                  │
│                                                                                      │
│  2. QUERY BANK ACCOUNTS                                                              │
│     └─ Uses: selectedCompanyId = SBO ✓ (FIXED!)                                     │
│     └─ Filters: WHERE company_id = SBO                                              │
│     └─ Result: Returns SBO bank accounts ✓                                          │
│                                                                                      │
│  3. CACHE KEY                                                                        │
│     └─ Query uses: ["bank-accounts", SBO] ✓ (MATCHES!)                              │
│     └─ Invalidation uses: ["bank-accounts", SBO]                                    │
│     └─ Cache refreshes correctly ✓                                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Section-by-Section Bank Account Support

The fix allows each sub-company to have its own bank accounts:

| Section | Bank Accounts |
|---------|--------------|
| School Bus Operations (SBO) | SBO Main Account, SBO Fuel Account |
| Yutong Sales (YUT) | Yutong Revenue Account |
| Sinotruck Sales (SNT) | Sinotruck Revenue Account |
| NCG Express (NCGE) | Express Cash Account |

**Same bank can be registered in multiple sections** by creating separate records with the same account number but different company_id.

---

## Currency Support

After fix, the currency dropdown will show all active currencies from the database:
- LKR - Sri Lankan Rupee (default)
- USD - US Dollar
- EUR - Euro
- GBP - British Pound
- AED - UAE Dirham
- INR - Indian Rupee
- SGD - Singapore Dollar
- AUD - Australian Dollar

---

## Testing Checklist

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Select SBO, create bank account | Account appears in table immediately |
| 2 | Switch to YUT, create bank account | Account appears in YUT table |
| 3 | Switch back to SBO | Only SBO accounts visible |
| 4 | Currency dropdown | LKR and other currencies visible |
| 5 | Default currency | LKR selected by default |

