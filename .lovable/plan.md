

# Fix Bank Reconciliation -- Clearing Bug, AP/AR Integration, No-Statement Mode

## Problems Identified

1. **Cannot clear transactions after statement import**: The `useBankTransactions` hook has a `limit(100)` which cuts off older or imported transactions. After importing hundreds of statement rows, many won't appear in the reconciliation table.
2. **AP/AR payments not tagged in bank reconciliation**: AP payments and AR receipts create `bank_transactions` records but don't set `source_type`, so there's no way to identify their origin in the recon view.
3. **Bank recon requires statement upload**: Currently you must enter a statement ending balance to save. Users should be able to reconcile book transactions (AP/AR/fees) against each other even without uploading a bank statement.
4. **No source visibility**: The reconciliation table doesn't show which module created each transaction (AP Payment, AR Receipt, Bank Fee, Manual, Statement Import).

---

## Changes

### 1. Remove Transaction Limit (Fix Clearing Bug)
**File: `src/hooks/useAccountingData.ts`** (line 519)

- Remove `.limit(100)` from `useBankTransactions` query, or increase to `.limit(1000)` with a date range filter
- Add a date range filter parameter so the reconciliation can request all unreconciled transactions plus transactions within the statement period
- This fixes the core bug where imported statement rows disappear from the clearing table

### 2. Tag AP/AR Transactions with Source Type
**File: `src/hooks/useAccountingMutations.ts`**

- When creating bank transactions for AR Receipts (line 612): add `source_type: "ar_receipt"` and `source_id: data.id` (the receipt ID)
- When creating bank transactions for AP Payments (line 932): add `source_type: "ap_payment"` and `source_id: data.id` (the payment ID)
- Bank fees already set source type via `useBankFees.ts`
- Inter-bank transfers set source type via `useInterBankTransfer.ts`

### 3. Show Source Type in Reconciliation Table
**File: `src/components/accounting/BankReconciliationWorksheet.tsx`**

- Add a "Source" column after the "Type" column showing origin badges:
  - "AP" (orange) for `source_type === "ap_payment"`
  - "AR" (blue) for `source_type === "ar_receipt"`
  - "FEE" (red) for bank fees
  - "IBT" (purple) for inter-bank transfers
  - "STMT" (green) for statement imports
  - "MAN" (gray) for manual entries
- Add corresponding CSS for `.source-badge` variants

### 4. Enable No-Statement Reconciliation Mode
**File: `src/components/accounting/BankReconciliationWorksheet.tsx`**

- Make "Statement Ending Balance" optional -- if left blank, use the bank account's `current_balance` as the comparison target
- Add a toggle/tab: "Statement Recon" vs "Book Recon" mode
  - **Statement Recon**: Current flow -- requires statement balance, clears against imported statement
  - **Book Recon**: Uses bank account's current balance as target, lets users clear AP/AR/fee transactions without a statement upload
- The Save button validates differently based on mode -- in Book Recon mode, statement balance is not required
- Summary footer shows "Bank Account Balance" instead of "Statement Ending Balance" in Book Recon mode

### 5. Add Date Range Filter for Reconciliation
**File: `src/components/accounting/BankReconciliationWorksheet.tsx`**

- Add "From Date" and "To Date" filters in the header
- Default: from last reconciliation date to statement date
- This helps users focus on specific periods and avoids loading too many transactions

### 6. Fetch All Unreconciled Transactions
**File: `src/hooks/useAccountingData.ts`**

- Create a new hook `useBankTransactionsForRecon(bankAccountId, fromDate?, toDate?)` that:
  - Fetches all unreconciled transactions (`is_reconciled = false`) regardless of date
  - PLUS recently reconciled ones within the date range (for display)
  - No hard limit, or limit of 2000
- The reconciliation worksheet uses this hook instead of `useBankTransactions`

---

## Technical Details

### Updated hook signature
```typescript
export const useBankTransactionsForRecon = (
  bankAccountId?: string,
  fromDate?: string,
  toDate?: string
) => {
  // Fetch: all unreconciled + reconciled within date range
  // No limit(100) -- fetch all unreconciled
};
```

### Source type tagging in AR Receipt mutation
```typescript
await supabase.from("bank_transactions").insert([{
  // ...existing fields...
  source_type: "ar_receipt",
  source_id: data.id,
}]);
```

### Source type tagging in AP Payment mutation
```typescript
await supabase.from("bank_transactions").insert([{
  // ...existing fields...
  source_type: "ap_payment",
  source_id: data.id,
}]);
```

### Files Modified (4)
- `src/hooks/useAccountingData.ts` -- New `useBankTransactionsForRecon` hook, remove limit
- `src/hooks/useAccountingMutations.ts` -- Add `source_type` and `source_id` to AR/AP bank transaction inserts
- `src/components/accounting/BankReconciliationWorksheet.tsx` -- Source column, date filters, no-statement mode, use new hook
- `src/components/accounting/BankReconciliationWorksheet.css` -- Source badge styles

