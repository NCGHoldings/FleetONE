

# Add payment_balance to Student Import — Minimal Fix

## The Gap

Your Excel "Amount Due" column maps to `payment_amount` in the edge function (line 159). But `payment_balance` (the field that drives the Outstanding tab, stats cards, and payment tracking) is **never written** during import. It stays at 0 for all imported students.

## Fix — 1 Line Change

### File: `supabase/functions/process-school-excel/index.ts`

At line 162, after `current_amount_due: updateNewValue`, add:

```
payment_balance: paymentAmountValue ? -(paymentAmountValue) : 0
```

This takes the "Amount Due" value from your Excel and sets it as a negative `payment_balance` (negative = outstanding debt).

**Logic**: If a student owes LKR 5,000, your Excel has `5000` in the Amount Due column → system stores `payment_balance = -5000` → Outstanding tab shows them correctly.

### Also add to the column mapping UI (`SchoolExcelImport.tsx`)

Add one more option to `REQUIRED_COLUMNS` (line 59):
```
{ dbColumn: "payment_balance", label: "Outstanding Balance", required: false }
```

This gives you **two ways** to set the balance:
1. **Amount Due column** → auto-converts to negative balance (for your current workflow)
2. **Direct Outstanding Balance column** → if your Excel already has negative/positive values

### Priority logic in edge function:
```
payment_balance: normalizedData.payment_balance ?? (paymentAmountValue ? -(paymentAmountValue) : 0)
```
- If you map a dedicated "Outstanding Balance" column → uses that directly
- If not, but "Amount Due" is mapped → converts to negative balance
- If neither → stays 0

## Files to Change

- `supabase/functions/process-school-excel/index.ts` — add `payment_balance` to record mapping (1 line)
- `src/components/school/SchoolExcelImport.tsx` — add "Outstanding Balance" to column options (1 line)

## Result

- Import your Excel with the Amount Due column mapped → all 536 students get correct outstanding balances immediately
- Outstanding tab, stats cards, and payment tracking all work from day one
- No need for any bulk update tool — the import handles it

