

# Fix Bank Statement Parser — "Cr/Dr" Column Bug + Manual Column Mapping

## Root Cause

Your file has: `Txn Date | Tran ID | Tran Serial | Description | Cr/Dr | Amount`

The generic parser's `findHeader` does partial matching. When searching for debit/credit columns:
- `"Dr"` partial-matches `"Cr/Dr"` → sets `debitCol = "Cr/Dr"`
- `"Cr"` partial-matches `"Cr/Dr"` → sets `creditCol = "Cr/Dr"`

Since both are truthy, the parser takes the `if (debitCol && creditCol)` branch, reads `cleanAmount("CR")` = 0 for every row, and filters everything out. The correct path (`amountCol` + `typeCol`) is never reached.

## Fix — Two Parts

### Part 1: Harden `findHeader` to prevent false partial matches

In `src/utils/bank-statement-processor.ts`, update `findHeader` so short candidates (2-3 chars like "Dr", "Cr") require exact normalized match, not partial. Also add validation: if `debitCol` and `creditCol` resolve to the same column, fall back to `amountCol + typeCol`.

Additionally add `"Tran ID"` and `"Tran Serial"` as reference candidates so those get captured.

### Part 2: Add manual column mapping UI

Add a column mapping step to `BankStatementUploadZone.tsx` between file upload and preview. When auto-detection finds 0 transactions (or user chooses manual mode), show Excel column headers with dropdowns to map:
- Date column
- Description column  
- Amount column
- Type (Cr/Dr) column
- Reference column (optional)
- Balance column (optional)

Auto-fill from detection when possible, allow manual override. Pass mapping to a new `parseBankStatementWithMapping()` function.

```
Flow:  Upload → [auto-parse] → 0 results? → Show Column Mapping → Re-parse → Preview
```

## Files to Change

- **`src/utils/bank-statement-processor.ts`**
  - Fix `findHeader`: exact match for short candidates (≤3 chars), prevent same-column debit/credit
  - Add `parseBankStatementWithMapping(file, mapping)` that accepts user-defined column map
  - Add "Tran ID", "Tran Serial" as reference candidates
  
- **`src/components/school/BankStatementUploadZone.tsx`**
  - Add column mapping step with dropdowns when auto-parse returns 0 transactions
  - Show detected Excel headers, let user assign: Date, Description, Amount, Type, Reference, Balance
  - Re-parse with user mapping and continue to preview

## Result

- Your file parses correctly immediately (parser fix handles Cr/Dr + Amount pattern)
- If any other unusual format fails auto-detection, the manual mapping UI appears as fallback
- Existing working formats (Commercial, Sampath, HNB, BOC) are unaffected

