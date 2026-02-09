
# Fix Bank Transactions Not Displaying - Implementation Plan

## Problem Summary

When viewing the Transactions tab in the Banking module under "School Bus Operations", no transactions appear even though:
1. Bank accounts exist with LKR 19.00 total balance
2. Transactions were created successfully (inter-bank transfer, AP payment)

## Root Cause Analysis

**Company ID Mismatch Between Bank Accounts and Transactions:**

| Entity | Company ID Used | Value |
|--------|-----------------|-------|
| Bank Account "main uresha" | `selectedCompanyId` | SBO (`0fba4a2f...`) |
| Bank Account "sampath" | `selectedCompanyId` | SBO (`0fba4a2f...`) |
| Bank Transactions | `effectiveCompanyId` | NCG Holding (`f40b0a9d...`) |

**Query Filter:**
- `useBankTransactions` filters by `selectedCompanyId` (SBO)
- But transactions were stored with `effectiveCompanyId` (NCG Holding)
- Result: No matches, empty table

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW MISMATCH                                   │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Bank Account Created                     Bank Transaction Created             │
│  ────────────────────                     ────────────────────────             │
│  company_id: SBO (0fba4a2f...)           company_id: NCG Holding (f40b0a9d...)│
│          ↓                                          ↓                         │
│  Query: WHERE company_id = SBO            Stored: company_id = NCG Holding    │
│          ↓                                          ↓                         │
│  Result: 2 bank accounts ✓                Result: 0 matches ✗                 │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Solution Strategy

**Transactions should inherit company_id from their bank account**, not from the user's current company context. This maintains the section-specific bank account design while ensuring transactions are correctly linked.

### Approach
1. When creating bank transactions, fetch the bank account's `company_id` and use that
2. Alternatively, use `selectedCompanyId` consistently (simpler approach)
3. Fix existing data with SQL update

## Files to Modify

### 1. `src/hooks/useInterBankTransfer.ts`

**Change from:**
```typescript
const { getEffectiveCompanyId } = useCompany();
const effectiveCompanyId = getEffectiveCompanyId();

// Transaction insert uses effectiveCompanyId
company_id: effectiveCompanyId
```

**Change to:**
```typescript
const { selectedCompanyId } = useCompany();

// Transaction insert uses selectedCompanyId (matches bank account)
company_id: selectedCompanyId
```

Apply this change in:
- Line 84-85: Query for transfers
- Line 134-136: Create transfer mutation
- Lines 241, 253: Bank transaction inserts
- Line 269: Transfer record insert

### 2. `src/hooks/useAccountingMutations.ts`

**useCreateAPPayment (line 679):**
```typescript
// Current: uses effectiveCompanyId
company_id: effectiveCompanyId,

// Fix: use selectedCompanyId
company_id: selectedCompanyId,
```

Also update cache invalidation to include `selectedCompanyId` in the query key:
```typescript
queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
```

### 3. `src/hooks/useFuelExpenseFinance.ts`

Check and update bank transaction creation to use correct company_id matching the bank account.

### 4. Database Fix - Existing Transactions

Run SQL migration to fix existing transactions by matching them to their bank account's company_id:

```sql
-- Update bank_transactions to match their bank account's company_id
UPDATE bank_transactions bt
SET company_id = ba.company_id
FROM bank_accounts ba
WHERE bt.bank_account_id = ba.id
  AND bt.company_id != ba.company_id;
```

## Complete Fix Implementation

### File: `src/hooks/useInterBankTransfer.ts`

| Location | Change |
|----------|--------|
| Line 83-84 | Change `getEffectiveCompanyId` to `selectedCompanyId` |
| Line 87 | Query key: use `selectedCompanyId` |
| Line 99 | Filter: use `selectedCompanyId` |
| Line 134 | Remove `getEffectiveCompanyId`, use `selectedCompanyId` |
| Line 182 | Journal entry: use `selectedCompanyId` |
| Line 241, 253 | Bank transactions: use `selectedCompanyId` |
| Line 269 | Transfer record: use `selectedCompanyId` |

### File: `src/hooks/useAccountingMutations.ts`

| Location | Change |
|----------|--------|
| Line 679 | Bank transaction insert: use `selectedCompanyId` |
| Line 707 | Cache invalidation: add `selectedCompanyId` to key |

### Database Migration

```sql
-- Fix existing bank transactions to match their bank account's company_id
UPDATE bank_transactions bt
SET company_id = ba.company_id,
    updated_at = NOW()
FROM bank_accounts ba
WHERE bt.bank_account_id = ba.id
  AND bt.company_id != ba.company_id;
```

## Data Flow After Fix

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                           FIXED DATA FLOW                                      │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  User Context: School Bus Operations (SBO)                                     │
│                                                                                │
│  Bank Account Created                     Bank Transaction Created             │
│  ────────────────────                     ────────────────────────             │
│  company_id: SBO ✓                        company_id: SBO ✓ (FIXED!)          │
│          ↓                                          ↓                         │
│  Query: WHERE company_id = SBO            Stored: company_id = SBO            │
│          ↓                                          ↓                         │
│  Result: 2 bank accounts ✓                Result: 3 transactions ✓            │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Testing Checklist

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | View Transactions tab under SBO | Previously created transactions now visible |
| 2 | Create new inter-bank transfer | Transaction appears in table immediately |
| 3 | Record AP payment with bank account | Bank transaction visible in Transactions tab |
| 4 | Switch to another company | Only that company's transactions visible |
| 5 | Cache invalidation | Table updates without page refresh |

## Technical Notes

### Why selectedCompanyId vs effectiveCompanyId?

- **effectiveCompanyId**: Returns parent company (NCG Holding) for sub-companies, used for consolidated Chart of Accounts and GL
- **selectedCompanyId**: Returns the actual selected company (e.g., SBO), used for section-specific data like bank accounts

Since bank accounts are section-specific, their transactions must also be section-specific to maintain data integrity and correct querying.

### GL Posting Consideration

Journal entries still use `effectiveCompanyId` for consolidated GL, which is correct. Only bank_transactions should use `selectedCompanyId` to match bank accounts.
