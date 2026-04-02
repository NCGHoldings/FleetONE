

# Improve Journal Entry Reversal Flow

## Current Issues
1. Original JE is marked as **"void"** — loses its identity as a reversed entry
2. The `is_reversal` and `reversed_entry_id` columns exist in the database but are **never populated**
3. No visual link between original and its reversal entry
4. Confirmation exists (`window.confirm`) but should use a proper styled dialog

## Plan

### 1. Add "reversed" to status enum (Migration)
Add `'reversed'` to the `journal_entry_status` enum so original entries show "REVERSED" badge instead of "VOID".

### 2. Update `useReverseJournalEntry` mutation
**File: `src/hooks/useAccountingMutations.ts`**

- Set original entry status to `'reversed'` instead of `'void'`
- Set `is_reversal: true` and `reversed_entry_id: entryId` on the new reversal entry
- Set `source_module` on reversal entry matching original's `source_module`
- After creating reversal, update the original entry's `reversed_entry_id` to point back to the reversal entry (bidirectional link)

### 3. Enhance the Detail Dialog UI
**File: `src/components/accounting/JournalEntryDetailDialog.tsx`**

- Replace `window.confirm` with a proper `AlertDialog` component (confirmation with description text)
- Show "Reverse Entry" button only for `posted` entries (already done)
- When viewing a **reversed** entry: show an info banner — "This entry was reversed by REV-xxx" with a clickable link
- When viewing a **reversal** entry: show an info banner — "This is a reversal of JE-xxx"  
- Add `reversed` to status badge variant mapping (e.g., orange/warning color)

### 4. Update JournalEntriesView status filter
**File: `src/components/accounting/JournalEntriesView.tsx`**

Add "reversed" to the status filter dropdown so users can filter reversed entries.

## Files to modify
- **Migration**: Add `'reversed'` to enum
- `src/hooks/useAccountingMutations.ts` — Populate `is_reversal`, `reversed_entry_id`, use `'reversed'` status
- `src/components/accounting/JournalEntryDetailDialog.tsx` — AlertDialog confirmation, reversal info banners
- `src/components/accounting/JournalEntriesView.tsx` — Add "reversed" to status filter

## Result
- Original JE shows **"REVERSED"** badge (not void)
- Reversal JE shows **"POSTED"** with `is_reversal = true`
- Both entries link to each other with info banners
- Proper styled confirmation dialog before reversing
- Full audit trail preserved — nothing hidden

