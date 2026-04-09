

# Fix School Bus KPI Cards — Data & Calculation Corrections

## Problem

The KPI cards on the Payment Management page show mostly zeros because:

1. **567 students still have `payment_balance = 0`** despite having `current_amount_due` values (5.1M LKR total for this branch alone). The previous migration fixed some students but missed these — likely imported after the migration ran.

2. **"Paid Students" = 0** because `payment_status` is 'pending' for all 536 students in this branch. No logic updates the status when payments are recorded.

3. **"Total Revenue" = 0** because it reads from `payment_amount` (which is NULL). Actual revenue exists in `school_payment_transactions.amount_paid` (LKR 20,200 for 2 transactions in this branch).

4. **"Total Owed" = 0** because it checks `payment_balance < 0`, but balance is 0 for this branch.

5. **"Overdue Amount" = 0** because no students have `payment_status = 'overdue'`.

## Solution

### 1. New SQL migration — fix remaining zero balances

```sql
UPDATE public.school_students 
SET payment_balance = -(current_amount_due) 
WHERE payment_balance = 0 
  AND current_amount_due > 0 
  AND is_active = true;
```

This fixes the remaining 567 students globally.

### 2. Fix `calculateStats` to use correct data sources

**File**: `src/pages/SchoolPayments.tsx` — `calculateStats` function (lines 113-135)

Current logic is broken — fix each KPI:

| KPI | Current (broken) | Fixed |
|-----|------------------|-------|
| Paid Students | `payment_status === 'paid'` | `payment_balance >= 0 AND current_amount_due > 0` (settled or overpaid) |
| Pending | `payment_status === 'pending'` | `payment_balance < 0` (still owes money) |
| Total Revenue | `SUM(payment_amount) where status='paid'` | Fetch from `school_payment_transactions` SUM(amount_paid) for this branch |
| Overdue Amount | `SUM(current_amount_due) where status='overdue'` | `SUM(current_amount_due) where payment_balance < 0` (all outstanding) |
| Total Owed | `SUM(abs(payment_balance)) where balance < 0` | Same logic but now works because migration fixes the data |
| Advance Paid | `SUM(payment_balance) where balance > 0` | Correct, works after data fix |

### 3. Fetch actual revenue from transactions table

Add a separate Supabase query in `fetchStudents` to get total revenue from `school_payment_transactions` joined with students in this branch, instead of relying on the broken `payment_amount` field.

### 4. Derive payment status dynamically

Instead of relying on the static `payment_status` column, derive it in `calculateStats`:
- **Paid/Settled**: `payment_balance >= 0`
- **Pending/Outstanding**: `payment_balance < 0`
- Use `current_amount_due` as fallback when `payment_balance` is still 0

## Files to Change

- **New SQL migration** — UPDATE remaining 567 students with zero balance
- **`src/pages/SchoolPayments.tsx`** — fix `calculateStats` to derive stats from balance fields + fetch revenue from transactions table

## Result

- Total Owed correctly shows ~LKR 5.1M for this branch
- Revenue reflects actual payments received (LKR 20,200)
- Paid/Pending counts derived from actual financial data, not stale status field
- All 7 KPI cards show accurate, interconnected data

