

# Fix Balance vs Amount Due — Make Outstanding Correct at Import

## The Problem

Your imported students show **Balance = LKR 12,200 (credit)** when they actually **owe** LKR 12,200. The system treats positive `payment_balance` as credit (overpayment) and negative as outstanding debt. The import stored the value as positive, so every student appears to have a credit instead of an outstanding balance.

That's why stats show "Advance Paid: LKR 7,453,925 Credit" and "Total Owed: LKR 0".

## The Fix

### Edge Function (`process-school-excel/index.ts`)

Change the `payment_balance` logic at line 163:

**Current**: Stores `payment_balance` as-is from Excel (positive = credit)

**New**: Always negate the amount due to create outstanding debt:
```
payment_balance = -(current_amount_due)
```

So if Excel has Amount Due = 12,200 → `payment_balance = -12,200` → UI shows "LKR 12,200 (outstanding)"

Priority logic:
1. If user explicitly mapped "Outstanding Balance" column → negate that value (since Excel has positive numbers meaning debt)
2. If only "Amount Due" mapped → use `-(current_amount_due)`
3. If neither → 0

### Also: Fix Existing 536 Students

Run a one-time SQL migration to flip the sign on all students who were imported with wrong positive balances:
```sql
UPDATE school_students 
SET payment_balance = -(payment_balance) 
WHERE payment_balance > 0 AND is_active = true;
```

This converts all current "credit" balances to "outstanding" balances.

## Files to Change

- `supabase/functions/process-school-excel/index.ts` — fix `payment_balance` to always store as negative (outstanding)
- New SQL migration — flip existing positive balances to negative

## Result

- Balance column shows "LKR 12,200 (outstanding)" in red instead of "(credit)" in green
- Amount Due and Balance match: both show the same amount the student owes
- Stats cards show correct Total Owed and zero Advance Paid
- When payments come in, balance reduces toward zero (then goes positive = credit if overpaid)
- Future AR invoice generation works correctly against the outstanding balance

