
# Fix: Clean Orphaned JEs from Live COA + Add Reusable Orphan Cleanup Tool

## What's Wrong

The **COMMERCIAL BANK C/A - 13001011** account shows 2 orphaned journal entries that leaked from test-mode Special Hire operations:

| Entry | Type | Amount | Status |
|---|---|---|---|
| `SPH-FULL-QUO-2025-0187-v1.1-MNIFWKJ2` | Debit | 59,990.00 | posted |
| `REV-SPH-ADV-QUO-2025-0019-MNI9U7YI` | Credit | 91,249.50 | posted |
| `SPH-ADV-QUO-2025-0019-MNI9U7YI` | (reversed) | — | reversed |
| `REV-SPH-FULL-QUO-2026-1640-v1.1` | (reversal) | — | posted |

All 4 JEs have **zero links** to any AR invoice, AR receipt, AP invoice, or AP payment. They are orphans from deleted/test Special Hire payments that leaked into the live GL before the isolation fix.

The JE delete button exists in the Journal Entries list view, but the user can't easily find these from the COA DrillDown. And after deleting, the COA balance still needs reconciliation.

## Solution: Two Changes

### 1. Add "Delete JE" button directly in the DrillDown Modal

In the DrillDown modal's transaction table, add a small red trash icon per row. Clicking it:
- Confirms via AlertDialog
- Calls `reverseAndDeleteJournalEntry` (same utility used everywhere)
- Refreshes the drilldown data
- Shows success toast

This lets users clean up bad entries directly from the COA view without navigating to the JE list.

### 2. Add "Orphaned JE Scanner" to Balance Reconciliation Tool

Add a new section to the existing `BalanceReconciliationTool.tsx` that:
- Scans for JEs that have NO linked source document (no AR invoice, AP invoice, AR receipt, or AP payment references them)
- Displays them in a table with entry number, date, description, and total amount
- Provides a "Delete All Orphaned JEs" button that bulk-deletes them using `reverseAndDeleteJournalEntry`
- After cleanup, auto-runs the balance reconciliation to fix any COA discrepancies

This gives a reusable tool for future cleanups during the testing phase.

## Technical Details

### DrillDown Modal changes
- Import `Trash2`, `AlertDialog` components, and `reverseAndDeleteJournalEntry`
- Add state: `deleteConfirmJEId`
- Add trash icon button in each table row (new column)
- Add AlertDialog for confirmation
- On delete success: invalidate the drilldown query + chart-of-accounts queries

### Orphan Scanner in BalanceReconciliationTool
- New function `scanOrphanedJEs(companyId)`: queries `journal_entries` LEFT JOIN all source tables, filters where all links are null
- New state: `orphanedJEs`, `isScanning`, `isCleaning`
- "Scan for Orphaned JEs" button
- Results table showing orphans
- "Delete All Orphaned JEs" button with confirmation
- After cleanup, auto-triggers reconciliation fix

## Files
- **Modify**: `src/components/accounting/DrillDownModal.tsx` — add per-row delete button + confirmation
- **Modify**: `src/components/accounting/settings/BalanceReconciliationTool.tsx` — add orphaned JE scanner section
