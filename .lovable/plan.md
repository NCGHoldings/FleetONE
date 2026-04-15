

# Fix: School Bus AR Invoice Duplicate Charging & Balance Reset

## The Problem

You're about to go live, and the AR invoice generation formula **double-charges students** by rolling the `payment_balance` (outstanding debt) into every new invoice. Here's the exact bug:

```
Lines 475-479 in useSchoolBusFinance.ts:

chargeAmount = fixedAmount × (billingPercentage / 100)    // e.g. 8,700 × 80% = 6,960
outstanding  = |min(payment_balance, 0)|                  // e.g. |-8,700| = 8,700
credit       = max(payment_balance, 0)                    // e.g. 0
amount       = chargeAmount + outstanding - credit        // e.g. 6,960 + 8,700 = 15,660  ← WRONG
```

**The `outstanding` is already encoded in `payment_balance`** — it represents cumulative unpaid debt. Adding it to each new invoice means:
- Month 1: Invoice = 6,960 + 8,700 (imported debt) = 15,660
- Month 2: If unpaid, balance is now -15,660, so Invoice = 6,960 + 15,660 = 22,620
- This snowballs every month — **duplicate compounding**

**Additionally**, since you're going live for the first time:
- 1,813 out of 1,835 students have `payment_balance = -fixed_monthly_amount` (imported with debt equal to one month's fee)
- These balances came from the Excel import and are **stale/legacy** — they should be reset to 0 before the first real billing cycle

## The Fix (3 parts)

### 1. Reset all student balances to 0 for go-live
Since no real payments have been recorded (only 11 test transactions), reset all students:
```sql
UPDATE school_students 
SET payment_balance = 0, 
    current_amount_due = 0,
    updated_at = NOW()
WHERE is_active = true;
```
This gives you a clean slate for the first billing cycle.

### 2. Fix the AR invoice amount formula
Change the invoice amount to charge **only the fixed amount × billing percentage** — do NOT add outstanding balance. The outstanding debt is already tracked in `payment_balance` and should not be re-invoiced.

**Before:** `amount = chargeAmount + outstanding - credit`
**After:** `amount = chargeAmount` (just the monthly charge)

This change applies to both code paths (lines 475-479 and lines 545-549).

### 3. Fix the BulkARInvoiceDialog preview calculation
The `calculateStudentAmount` function (line 76-81) uses the same broken formula. Fix it to match.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useSchoolBusFinance.ts` | Fix invoice amount formula in 2 places (lines ~475-479 and ~545-549) — remove `outstanding` addition |
| `src/components/school/BulkARInvoiceDialog.tsx` | Fix `calculateStudentAmount` (line ~76-81) to match |
| **DB migration** | Reset `payment_balance` and `current_amount_due` to 0 for all active students |

## What This Means for Your Workflow Going Forward

1. **Generate AR Invoice** → charges `fixed_amount × billing_%` only (e.g., 80% of 8,700 = 6,960)
2. **Record Payment** → updates `payment_balance` via the existing DB trigger
3. If a student **underpays**, their `payment_balance` goes negative naturally
4. If a student **overpays**, their `payment_balance` goes positive (credit)
5. Next month's invoice is still just the fixed charge — the balance is tracked separately, not compounded into invoices

