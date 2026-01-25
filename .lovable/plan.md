
# Special Hire Trigger Fix - Implementation Plan

## Problem Summary

The database trigger `update_quotation_payment_totals` is missing `total_additional_charges` in the `balance_due` calculation, causing:
- Incorrect balance amounts displayed to users
- Wrong AR Invoice totals sent to Finance
- Incorrect GL postings

**Evidence from Live Data:**

| Quotation | Additional Charges | Current Balance | Correct Balance | Error |
|-----------|-------------------|-----------------|-----------------|-------|
| QUO-2026-0944 | 26,500 | 95,641 | 122,141 | -26,500 |
| QUO-2026-0862 | 6,750 | -6,750 | 0 | -6,750 |
| QUO-2026-0810 | 12,250 | 80,704 | 92,954 | -12,250 |
| QUO-2025-0786 | 1,750 | -1,750 | 0 | -1,750 |
| QUO-2025-0764 | 2,250 | -2,250 | 0 | -2,250 |

---

## Implementation Steps

### Step 1: Create Database Migration

Create a new migration file that will:

1. **Fix the trigger function** - Add `COALESCE(total_additional_charges, 0)` to the balance calculation
2. **Repair existing data** - Update all confirmed quotations with correct balance_due values

**Migration SQL:**

```sql
-- Fix update_quotation_payment_totals to include total_additional_charges
CREATE OR REPLACE FUNCTION public.update_quotation_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.special_hire_quotations 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
      AND status = 'approved'
    ),
    advance_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.special_hire_payments 
      WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id) 
      AND payment_type = 'advance'
      AND status = 'approved'
    ),
    balance_due = (
      (gross_revenue + 
       COALESCE(fuel_cost_fuel_only, 0) + 
       COALESCE(commission_pass_through_amount, 0) + 
       COALESCE(total_additional_charges, 0) -  -- THIS LINE ADDED
       COALESCE(discount_amount_lkr, 0)) - (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.special_hire_payments 
        WHERE quotation_id = COALESCE(NEW.quotation_id, OLD.quotation_id)
        AND status = 'approved'
      )
    )
  WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Repair all existing confirmed quotation balances
UPDATE special_hire_quotations
SET balance_due = (
  gross_revenue + 
  COALESCE(fuel_cost_fuel_only, 0) + 
  COALESCE(commission_pass_through_amount, 0) + 
  COALESCE(total_additional_charges, 0) - 
  COALESCE(discount_amount_lkr, 0)
) - COALESCE(total_paid, 0)
WHERE status = 'confirmed';
```

---

## File to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_fix_balance_due_trigger.sql` | Fix trigger + repair data |

---

## Post-Deployment Verification

After migration runs, verify with this query (should return 0 rows):

```sql
SELECT quotation_no, balance_due, total_additional_charges
FROM special_hire_quotations
WHERE status = 'confirmed'
  AND balance_due != (
    gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + 
    COALESCE(commission_pass_through_amount, 0) + 
    COALESCE(total_additional_charges, 0) - 
    COALESCE(discount_amount_lkr, 0) - 
    COALESCE(total_paid, 0)
  );
```

---

## Technical Details

### What This Fixes

1. **Balance Display** - Customers see correct balance amounts
2. **AR Invoice Amounts** - Finance receives accurate invoice totals
3. **GL Postings** - Accounting entries reflect true transaction values
4. **Negative Balance Prevention** - No more incorrect negative balances

### No Frontend Changes Required

All frontend code already correctly includes `total_additional_charges`:
- `useFinanceApproval.ts` (lines 169-173)
- `PaymentConfirmationModal.tsx`
- `QuotationPreview.tsx`
- `GenerateBalanceInvoiceModal.tsx`

The trigger fix ensures database consistency matches the frontend calculations.
