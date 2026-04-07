

# Fix: Orphaned Journal Entries and COA Corruption from Past AP Payment Deletes

## What I Found

**16 orphaned Journal Entries** exist in the database — AP payments were deleted previously (before the cheque_register fix), but their JEs and JE lines were **never cleaned up**. This means:

1. **JE lines still exist** → COA balances were never reversed
2. **JE records still exist** → They appear in GL reports as real transactions
3. **COA `current_balance` is wrong** for all accounts touched by these deleted payments

### Orphaned JEs (payment deleted, JE remains):
| Entry Number | Description |
|---|---|
| JE-20260406-R0XJ | AP Payment to David Pieris Motor |
| JE-DP-PAY-2026-25577 | Direct Payment to T Tiron |
| JE-DP-PAY-2026-25574 | Direct Payment to Ledgerwall |
| JE-20260406-YHJH | AP Payment to NCG Green Energy |
| JE-20260406-LDR0 | AP Payment to NCG Green Energy (duplicate) |
| JE-DP-PAY-2026-25573 | Direct Payment to NCG Express |
| JE-DP-PAY-2026-25569 | Direct Payment to Nations Trust Bank |
| JE-20260404-QC4E | AP Payment to Darshani |
| JE-20260404-X3Z2 | AP Payment to Dialog Finance |
| + 7 more... |

## Two-Step Fix

### Step 1: Database Migration — Delete All Orphaned AP Payment JEs

Create a migration that:
1. Finds all `journal_entries` with description starting with "AP Payment:" or "Direct Payment" that have **no matching `ap_payments` row** linking to them
2. Deletes their `journal_entry_lines` first
3. Deletes the `journal_entries` themselves

This is safe because the parent AP payment record is already gone — these JEs are dangling references.

### Step 2: Recalculate All COA Balances

After cleaning orphaned JEs, run the existing `recalculateCOABalances` function (via the Balance Reconciliation Tool in Settings) to recompute every account's `current_balance` from actual remaining JE lines. This fixes all drift caused by the orphaned entries.

### Step 3: Prevent Future Orphans (Already Done)

The `reverseAndDeleteJournalEntry` function is already called in all delete mutations — this ensures future deletes properly clean up. No code changes needed.

## Files
- **New migration**: SQL to delete orphaned AP payment JEs and their lines
- **No code changes needed** — the reversal logic is already in place for future operations

## Result
- 16 orphaned JEs removed from the GL
- COA balances corrected to match actual posted transactions
- Future deletes will properly clean up (already working)
- User should run Balance Reconciliation Tool after migration to confirm all balances are correct

