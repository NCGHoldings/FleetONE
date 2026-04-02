

# Fix: "reversed" Status Enum Missing from Database

## Problem
The reversal code sets `status: 'reversed'` on journal entries, but the database enum `journal_status` only has `('draft', 'posted', 'void')`. The migration to add `'reversed'` was never created.

Error: `invalid input value for enum journal_status: "reversed"`

## Fix

### 1. Create a migration to add 'reversed' to the enum
```sql
ALTER TYPE journal_status ADD VALUE IF NOT EXISTS 'reversed';
```

This is a single-line migration. Once applied, the reversal flow will work end-to-end.

### Files
- **Create**: New migration file to add `'reversed'` to `journal_status` enum

No code changes needed — the TypeScript code already handles the `'reversed'` status correctly.

