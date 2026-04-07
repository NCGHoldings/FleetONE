

# Add Delete Option for Journal Entries (Testing Mode)

## Current State
- **AR Invoices**: Delete button exists, works for all statuses ✅
- **AP Invoices**: Delete button exists, works for all statuses ✅
- **AP Payments**: Delete button exists ✅
- **AR Receipts**: Delete button exists ✅
- **Journal Entries**: **NO delete button** ❌ — only View, Approve, Reject, and Reverse actions

## What's Needed

Add a **force delete** option to Journal Entries that:
1. Reverses COA balance impact (using the existing `reverseAndDeleteJournalEntry` utility)
2. Deletes all `journal_entry_lines`
3. Deletes the `journal_entry` record itself
4. Works for **any status** (draft, posted, reversed) during testing

## Implementation

### 1. Add `useDeleteJournalEntry` mutation in `useAccountingMutations.ts`
- Calls the existing `reverseAndDeleteJournalEntry()` from `gl-posting-utils.ts` which already handles COA balance reversal + line deletion + entry deletion
- Invalidates `journal-entries` and `chart-of-accounts` queries
- Shows success/error toast

### 2. Add delete button + confirmation dialog in `JournalEntriesView.tsx`
- Import `Trash2` icon and `AlertDialog` components
- Add a red trash button in the actions column (available for all statuses)
- Add `deleteConfirmId` state and confirmation dialog (same pattern as AP/AR views)
- Wire up to the new `useDeleteJournalEntry` mutation

## Safety
- The `reverseAndDeleteJournalEntry` utility already exists and is battle-tested (used by all AP/AR delete mutations)
- Only reverses COA balances for "posted" entries; draft entries are simply deleted
- No operational (trips, buses, routes) data is touched
- This is a temporary testing feature — can be disabled later by restricting `canDelete` to draft-only

## Files
- **Modify**: `src/hooks/useAccountingMutations.ts` — add `useDeleteJournalEntry` mutation
- **Modify**: `src/components/accounting/JournalEntriesView.tsx` — add delete button + confirmation dialog

