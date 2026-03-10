

# Fix: Fixed Amount Not Showing in Payments Page

## Root Cause

The database has **two separate columns**: `update_new` and `fixed_monthly_amount`. The Excel import correctly writes to `update_new` (e.g., Sayuni Lithnali has 5900 in `update_new`), but the **payments page UI reads from `fixed_monthly_amount`**, which is NULL for all imported students. That's why the "Fixed Amount" column shows "LKR 0".

Similarly, `current_amount_due` is also NULL — the import doesn't populate it either.

**DB state right now:**
| Column | Value |
|---|---|
| `update_new` | 5900 (populated ✓) |
| `fixed_monthly_amount` | NULL (not populated ✗) |
| `current_amount_due` | NULL (not populated ✗) |
| `payment_balance` | 0 |

## Fix

### 1. Edge Function `process-school-excel/index.ts`
When inserting/updating a student record, **also set `fixed_monthly_amount`** equal to `update_new` value. This ensures the payment page shows the correct amount. Also set `current_amount_due` to the same value so the "Amount Due" column is populated for new students.

```typescript
// In the record construction:
fixed_monthly_amount: updateNewValue,
current_amount_due: updateNewValue,
```

### 2. One-time Data Fix (SQL Migration)
Run a migration to backfill existing Ratnapura branch students where `update_new` is set but `fixed_monthly_amount` is NULL:

```sql
UPDATE school_students 
SET fixed_monthly_amount = update_new,
    current_amount_due = update_new
WHERE update_new IS NOT NULL 
  AND fixed_monthly_amount IS NULL 
  AND is_active = true;
```

This will immediately fix the 88 students already imported.

### Files to Edit
| File | Change |
|---|---|
| `supabase/functions/process-school-excel/index.ts` | Set `fixed_monthly_amount` and `current_amount_due` from `update_new` value |
| SQL migration | Backfill existing records |

