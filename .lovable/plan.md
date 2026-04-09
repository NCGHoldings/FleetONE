

# Fix Student Balance to Match Amount Due at Import

## The Problem

Your data shows **1,380 students** with `payment_balance = 0` but `current_amount_due > 0`. These students owe money but their balance shows zero — so they don't appear in the Outstanding tab and stats are wrong.

This happened because the balance fix migration only flipped students who already had positive balances (559 students). The other 1,380 were imported before the `payment_balance` mapping was added, so they never got a balance set.

**Current data breakdown (2,929 active students):**
- 559 with negative balance (correctly showing as owed) ✓
- 1,380 with zero balance but amount due > 0 ✗ — these need fixing
- 0 with positive balance ✓

## The Fix

### Migration: Set balance = -(amount_due) for unset students

```sql
UPDATE school_students 
SET payment_balance = -(current_amount_due) 
WHERE payment_balance = 0 
  AND current_amount_due > 0 
  AND is_active = true;
```

This sets the outstanding balance to match what they owe for all 1,380 students.

### Edge Function: Already fixed

The `process-school-excel/index.ts` already correctly sets `payment_balance = -(paymentAmountValue)` at import time (line 163). No code change needed — only the historical data needs correction.

## Files to Change

- **New SQL migration** — single UPDATE to set `payment_balance = -(current_amount_due)` for students with zero balance but outstanding amount due

## Result

- All 2,929 students will have Balance matching their Amount Due
- Outstanding tab and stats cards show correct totals
- AR invoice generation works against the correct balance
- Future imports automatically set balance correctly (already fixed)

