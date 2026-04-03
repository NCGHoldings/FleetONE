
# Fix GL Export: Wrong Column Names

## Problem
The export fails because the code references `debit_amount` and `credit_amount` on `journal_entry_lines`, but the actual columns are `debit` and `credit`.

## Fix

### 1. `src/components/accounting/GLExportModal.tsx`
- Change Supabase select from `debit_amount, credit_amount` → `debit, credit`
- Update mapping: `line.debit_amount` → `line.debit`, `line.credit_amount` → `line.credit`

### 2. `src/components/accounting/GLExcelExporter.ts`
- Rename `GLLineItem` interface fields from `debit_amount`/`credit_amount` → `debit`/`credit`
- Update all references in the export logic
