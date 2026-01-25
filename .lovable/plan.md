
# Special Hire Finance Integration - Complete Fix Plan

## Executive Summary

After comprehensive cross-checking of the Special Hire finance integration, I found **ONE CRITICAL DATABASE BUG** that must be fixed, plus confirmed all other components are working correctly.

---

## Critical Bug: Missing `total_additional_charges` in Database Trigger

### Evidence from Database

| Quotation | Additional Charges | DB Balance | Correct Balance | Discrepancy |
|-----------|-------------------|------------|-----------------|-------------|
| QUO-2026-0944 | 26,500 | 95,641 | 122,141 | **-26,500** |
| QUO-2026-0862 | 6,750 | **-6,750** | 0 | **-6,750** |
| QUO-2026-0810 | 12,250 | 80,704 | 92,954 | **-12,250** |
| QUO-2025-0786 | 1,750 | **-1,750** | 0 | **-1,750** |
| QUO-2025-0764 | 2,250 | **-2,250** | 0 | **-2,250** |

The discrepancy exactly equals `total_additional_charges` in every case - this confirms the trigger bug.

### Root Cause

The `update_quotation_payment_totals` trigger (line 275) calculates:

```sql
-- CURRENT (BROKEN)
balance_due = (gross_revenue + fuel + commission - discount) - payments
-- MISSING: + COALESCE(total_additional_charges, 0)
```

---

## Implementation Steps

### Part 1: Database Migration - Fix Trigger Function

Create a new migration file to fix the trigger:

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
      -- FIXED: Added COALESCE(total_additional_charges, 0)
      (gross_revenue + 
       COALESCE(fuel_cost_fuel_only, 0) + 
       COALESCE(commission_pass_through_amount, 0) + 
       COALESCE(total_additional_charges, 0) -  -- <-- THIS WAS MISSING
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

-- Repair existing quotation balances
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

## Verification: All Other Components Working Correctly

### Finance Integration Flow (Verified)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SPECIAL HIRE FINANCE FLOW - ALL VERIFIED                      │
└─────────────────────────────────────────────────────────────────────────────────┘

1. ADVANCE PAYMENT
   ├─ Record Payment (UI) ..................... WORKING
   ├─ Generate Sales Receipt .................. WORKING
   ├─ Operations Review → pending_finance ..... WORKING
   ├─ Finance Approval (useFinanceApproval) ... WORKING
   │   ├─ Create Customer (createOrGetSPHCustomer) ... WORKING
   │   ├─ Create AR Invoice (createSPHARInvoice) ..... WORKING
   │   ├─ Post GL: DR Bank / CR Advance .............. WORKING
   │   └─ Update COA Balances ........................ WORKING
   └─ Total Calculation (lines 169-173) ....... INCLUDES total_additional_charges ✓

2. TRIP COMPLETION + BALANCE INVOICE
   ├─ Post-Trip Adjustment (PostTripAdjustmentModal) ... WORKING
   ├─ Generate Balance Invoice (GenerateBalanceInvoiceModal) ... WORKING
   │   ├─ Calculate Final Balance ............. WORKING
   │   ├─ Post GL: DR Receivable / CR Revenue ... WORKING (postInvoiceToGLStandalone)
   │   ├─ Apply Advance: DR Advance / CR Receivable ... WORKING
   │   └─ Update AR Invoice (updateSPHARInvoiceOnInvoiceSent) ... WORKING
   └─ Email to Customer ....................... WORKING

3. BALANCE PAYMENT
   ├─ Record Balance Payment .................. WORKING
   ├─ Finance Approval ........................ WORKING
   │   ├─ Post GL: DR Bank / CR Receivable .... WORKING (postBalancePaymentToGLStandalone)
   │   ├─ Update AR Invoice ................... WORKING (updateSPHARInvoiceOnPayment)
   │   └─ Create AR Receipt ................... WORKING (createSPHARReceipt)
   └─ Payment linked to AR Invoice ............ WORKING

4. REFUND FLOW
   └─ Post GL: DR Advance / CR Bank ........... WORKING (postRefundToGLStandalone)
```

### GL Posting Rules (Verified in Code)

| Transaction | Debit Account | Credit Account | Code Location | Status |
|-------------|---------------|----------------|---------------|--------|
| Advance Payment | Bank (Asset) | Customer Advance (Liability) | Lines 119-141 | CORRECT |
| Full Payment | Bank (Asset) | Revenue | Lines 195-225 | CORRECT |
| Invoice Sent | Trade Receivable | Revenue | Lines 426-448 | CORRECT |
| Advance Applied | Customer Advance | Trade Receivable | Lines 501-523 | CORRECT |
| Balance Payment | Bank (Asset) | Trade Receivable | Lines 270-294 | CORRECT |
| Refund | Customer Advance | Bank (Asset) | Lines 345-368 | CORRECT |

### COA Balance Update Logic (Verified)

```typescript
// From useSpecialHireFinance.ts lines 60-62
const netAmount = (line.debit || 0) - (line.credit || 0);
const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
const adjustment = isDebitNormal ? netAmount : -netAmount;
```

| Account Type | Normal Side | Debit Effect | Credit Effect | Status |
|--------------|-------------|--------------|---------------|--------|
| Asset | Debit | +balance | -balance | CORRECT |
| Expense | Debit | +balance | -balance | CORRECT |
| Liability | Credit | -balance | +balance | CORRECT |
| Revenue | Credit | -balance | +balance | CORRECT |

### Total Calculation in useFinanceApproval (Verified)

```typescript
// Lines 169-173 - CORRECTLY includes total_additional_charges
const totalAmount = (paymentData.quotation.gross_revenue || 0) +
  (paymentData.quotation.fuel_cost_fuel_only || 0) +
  (paymentData.quotation.commission_pass_through_amount || 0) +
  (paymentData.quotation.total_additional_charges || 0) -  // ✅ INCLUDED
  (paymentData.quotation.discount_amount_lkr || 0);
```

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_fix_balance_due_trigger.sql` | Fix trigger + repair data |

---

## Post-Deployment Verification

After migration runs, verify with this query:

```sql
-- Should return 0 rows (no discrepancies)
SELECT quotation_no, balance_due,
  (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + 
   COALESCE(commission_pass_through_amount, 0) + 
   COALESCE(total_additional_charges, 0) - 
   COALESCE(discount_amount_lkr, 0) - 
   COALESCE(total_paid, 0)) as correct_balance
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

## Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| `update_quotation_payment_totals` trigger | BUG | Fix to include `total_additional_charges` |
| Existing quotation data | INCORRECT | Repair via UPDATE statement |
| Frontend calculations | CORRECT | No changes needed |
| GL posting functions | CORRECT | No changes needed |
| AR Invoice functions | CORRECT | No changes needed |
| COA balance updates | CORRECT | No changes needed |
| Finance approval flow | CORRECT | No changes needed |
| Customer creation | CORRECT | No changes needed |

**Total Files to Modify: 1 (database migration)**

This single database fix will resolve all the balance discrepancy issues and ensure correct AR Invoice amounts and GL postings going forward.
