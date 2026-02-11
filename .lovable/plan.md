

# Fix: Depreciation GL Posting to Update COA Balances

## Problem

The `useRunDepreciationWithGL` hook creates journal entries and lines correctly, but **bypasses the COA balance update step**. It directly inserts into `journal_entries` and `journal_entry_lines` tables instead of using the centralized `createAndPostJournalEntry()` utility. This means:

- Trial Balance does not reflect depreciation expense
- P&L Statement is missing depreciation costs
- Balance Sheet accumulated depreciation is understated
- Manual reconciliation is required to fix balances

## Fix

### File: `src/hooks/useAccountingMutations.ts` (lines ~2191)

After the journal entry lines are inserted (line 2191), add a loop to update each affected COA account balance -- matching exactly what `createAndPostJournalEntry()` does internally.

**Add after line 2191** (`await supabase.from("journal_entry_lines").insert(linesWithJE);`):

```typescript
// Update COA balances for each journal line
for (const line of linesWithJE) {
  const { data: account } = await supabase
    .from("chart_of_accounts")
    .select("current_balance, account_type")
    .eq("id", line.account_id)
    .single();

  if (account) {
    const isDebitNormal = ["asset", "expense"].includes(account.account_type);
    const adjustment = isDebitNormal
      ? (line.debit - line.credit)
      : (line.credit - line.debit);

    await supabase
      .from("chart_of_accounts")
      .update({
        current_balance: (account.current_balance || 0) + adjustment
      })
      .eq("id", line.account_id);
  }
}
```

This ensures:
- **Depreciation Expense account** (expense type, debit-normal) increases by the depreciation amount
- **Accumulated Depreciation account** (contra-asset, credit-normal) increases by the same amount
- Balances update in real-time, no manual reconciliation needed

### Why not switch to `createAndPostJournalEntry()`?

The depreciation hook has a unique batching pattern -- it processes multiple assets, aggregates all lines into one journal entry, and links each schedule entry back to the JE. Refactoring to use the utility would require significant restructuring. Adding the balance update loop after the existing insert is the minimal, safe fix that aligns the behavior.

## Result

After this fix, all 4 fixed asset operations will fully update COA balances automatically:

| Operation | JE Created | COA Updated | Status |
|-----------|-----------|-------------|--------|
| Acquisition | Yes | Yes | Working |
| Depreciation | Yes | **Yes (this fix)** | **Fixed** |
| Disposal | Yes | Yes | Working |
| Revaluation | Yes | Yes | Working |

