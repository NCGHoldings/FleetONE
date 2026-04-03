

# Fix: Remove Orphaned Bank Account and Reassign Journal Entries

## Problem

The account **1300101211 "COMMERCIAL BANK C/A - 1001077213 (SHS) - remove"** is an orphaned duplicate sitting at the wrong level. The correct account already exists as **13001011** under CASH AT BANK.

The orphan has **3 journal entry lines** that need to be reassigned before deletion:

| JE | Debit | Credit | Status |
|----|-------|--------|--------|
| SPH-ADV-QUO-2025-0019 | 91,249.50 | — | reversed |
| REV-SPH-ADV-QUO-2025-0019 | — | 91,249.50 | posted |
| SPH-FULL-QUO-2025-0187 | 59,990.00 | — | posted |

## Fix — Single Migration

1. **Reassign** all 3 `journal_entry_lines` from orphan account (`6702d2bf-...`) to the correct account (`5a48ae07-...`, code 13001011)
2. **Delete** the orphan account `1300101211` (`6702d2bf-...`)
3. **Recalculate COA balance** on the correct account to reflect the moved lines

### Migration SQL
```sql
-- Move JE lines to correct account
UPDATE journal_entry_lines 
SET account_id = '5a48ae07-19e0-46d8-bd5c-1adc371d3d63'
WHERE account_id = '6702d2bf-8a12-4f82-83eb-d37b61b4993e';

-- Delete orphan
DELETE FROM chart_of_accounts 
WHERE id = '6702d2bf-8a12-4f82-83eb-d37b61b4993e';
```

### Files
- **Create**: Migration file to reassign lines and delete orphan

### Result
- Orphan account removed from COA tree
- All journal entries preserved and linked to correct 13001011 account
- No data loss — just account reassignment

