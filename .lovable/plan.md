

# Fix: COA Balance Out of Sync with Journal Entry Totals

## Problem Found

The Seylan Bank C/A account (13001001) shows **LKR 24,000** in the COA tree, but the DrillDown modal correctly calculates the **Net Movement as -LKR 200,000** from actual journal entry lines.

**Root cause**: The `current_balance` field on `chart_of_accounts` is updated incrementally (add/subtract on each transaction). When transactions are deleted or reversed without properly reversing the balance adjustment, the stored balance drifts out of sync. The recent "force delete" feature for AP payments/invoices deletes JE lines but does NOT reverse the COA balance updates, causing this exact corruption.

**Evidence from database**:
- Account `9b3a2559` (NCG Holding): Total DR = 5,000,000 / Total CR = 5,200,000 → Net = -200,000. But `current_balance` = 24,000 (wrong)
- Account `8a348132` (sub-company): Total DR = 36,200 / Total CR = 0 → Net = 36,200. But `current_balance` = 8,000 (also wrong)

## Two Fixes Needed

### Fix 1: Force-delete must reverse COA balances before deleting JE lines

**File**: `src/hooks/useAccountingMutations.ts`

In `useDeleteAPPayment`, `useDeleteAPInvoice`, `useDeleteARInvoice`, and `useDeleteARReceipt`:
- Before deleting journal entry lines, fetch them with their debit/credit amounts
- Call `reverseAccountBalance(accountId, debit, credit)` for each line — this subtracts the original balance adjustment
- Then proceed with line deletion

Add a helper function:
```typescript
async function reverseCOABalancesForJE(journalEntryId: string) {
  // Fetch all lines for this JE
  // For each line, reverse the balance adjustment on the COA account
  // (opposite of updateAccountBalance logic)
}
```

### Fix 2: Add a "Recalculate All Balances" action (already exists partially)

**File**: `src/lib/gl-posting-utils.ts` — `recalculateCOABalances` already exists

The existing Balance Reconciliation Tool can fix current corruption. But we should also:
- Auto-run reconciliation after any force-delete operation, OR
- At minimum, show a warning toast after delete: "COA balances have been updated"

### Fix 3: Immediate data fix — recalculate all COA balances now

After deploying Fix 1, trigger the existing `recalculateCOABalances` function (via the Balance Reconciliation Tool in Settings) to fix all currently corrupted balances across all accounts.

## Files
- **Modify**: `src/hooks/useAccountingMutations.ts` — add COA balance reversal before JE line deletion in all delete mutations
- **Modify**: `src/lib/gl-posting-utils.ts` — export a reusable `reverseCOABalancesForJE` helper

## Result
- Force-deleting AP/AR invoices and payments will properly reverse COA balance changes
- Existing corrupted balances can be fixed via the Reconciliation Tool
- COA tree balances will match the DrillDown net movement going forward

