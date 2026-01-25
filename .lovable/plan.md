

# Special Hire Finance Integration - Complete Cross-Check Report

## Executive Summary

After thorough examination of the codebase and database, I found **ONE CRITICAL BUG** that must be fixed immediately, plus confirmation that the rest of the system is correctly implemented but requires configuration.

---

## CRITICAL BUG FOUND: Missing `total_additional_charges` in Trigger

### The Problem

The database trigger `update_quotation_payment_totals` is **missing `total_additional_charges`** in the `balance_due` calculation. This causes:

1. **Negative balance_due values** when customers pay including additional charges
2. **Incorrect AR Invoice amounts** when invoice is generated
3. **GL posting with wrong amounts**

### Current Broken Formula (in database trigger):

```sql
balance_due = (gross_revenue + fuel_cost + commission - discount) - payments
-- MISSING: + total_additional_charges
```

### Evidence from Database:

| Quotation | Total Charges | Actual Paid | DB Balance | Correct Balance | Difference |
|-----------|---------------|-------------|------------|-----------------|------------|
| QUO-2026-0944 | 26,500 | 100,000 | 95,641 | 122,141 | -26,500 |
| QUO-2026-0862 | 6,750 | 73,142 | -6,750 | 0 | -6,750 |
| QUO-2026-0810 | 12,250 | 25,000 | 80,704 | 92,954 | -12,250 |

### Required Fix (Database Migration):

```sql
CREATE OR REPLACE FUNCTION update_quotation_payment_totals()
RETURNS TRIGGER AS $$
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
      -- FIXED: Added total_additional_charges
      (gross_revenue + COALESCE(fuel_cost_fuel_only, 0) + 
       COALESCE(commission_pass_through_amount, 0) + 
       COALESCE(total_additional_charges, 0) -    -- <-- THIS WAS MISSING
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
$$ LANGUAGE plpgsql;
```

### Data Fix Query (to repair existing records):

```sql
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

## Special Hire Finance Flow - Verification Status

### 1. Advance Payment Flow

| Step | Function | Status | Notes |
|------|----------|--------|-------|
| Record Payment | UI Form | WORKING | Sets status = 'pending_operations' |
| Generate Sales Receipt | AdvanceDetailsModal | WORKING | Creates draft document |
| Operations Review | ConfirmedTripsTable | WORKING | Changes to 'pending_finance' |
| Finance Approval | useFinanceApproval | WORKING | Triggers GL posting |
| GL Posting (Advance) | postAdvancePaymentToGLStandalone | WORKING | DR Bank / CR Customer Advance |
| Customer Creation | createOrGetSPHCustomer | WORKING | With fallback logic |
| AR Invoice Creation | createSPHARInvoice | WORKING | Links to quotation |
| COA Balance Update | updateAccountBalancesFromJournalEntry | WORKING | Proper debit/credit rules |

### 2. Balance Invoice Flow

| Step | Function | Status | Notes |
|------|----------|--------|-------|
| Trip Completion | TripAdjustmentModal | WORKING | Records extra KM, expenses |
| Generate Balance Invoice | GenerateBalanceInvoiceModal | WORKING | Includes adjustments |
| Email to Customer | handleEmailToCustomer | WORKING | Triggers GL posting |
| GL Posting (Invoice) | postInvoiceToGLStandalone | WORKING | DR Trade Receivable / CR Revenue |
| Advance Application | applyAdvanceToInvoiceStandalone | WORKING | DR Customer Advance / CR Trade Receivable |
| AR Invoice Update | updateSPHARInvoiceOnInvoiceSent | WORKING | Updates total with adjustments |

### 3. Balance Payment Flow

| Step | Function | Status | Notes |
|------|----------|--------|-------|
| Record Balance | UI Form | WORKING | Records payment_type = 'balance' |
| Finance Approval | useFinanceApproval | WORKING | Detects balance payment |
| GL Posting (Balance) | postBalancePaymentToGLStandalone | WORKING | DR Bank / CR Trade Receivable |
| AR Invoice Update | updateSPHARInvoiceOnPayment | WORKING | Updates paid_amount, status |
| AR Receipt Creation | createSPHARReceipt | WORKING | Creates receipt allocation |

### 4. Refund Flow

| Step | Function | Status | Notes |
|------|----------|--------|-------|
| Process Refund | TripStatusManagementModal | WORKING | Calls postRefundToGLStandalone |
| GL Posting (Refund) | postRefundToGLStandalone | WORKING | DR Customer Advance / CR Bank |

---

## Finance Settings Status

| Module | Settings Table | Configured | GL Accounts Mapped |
|--------|----------------|------------|-------------------|
| **Special Hire** | special_hire_finance_settings | YES | Bank, Advance, Revenue, Receivable |
| **Yutong** | yutong_finance_settings | NO | Not configured |
| **Sinotruck** | sinotruck_finance_settings | NO | Not configured |
| **Light Vehicle** | lightvehicle_finance_settings | NO | Not configured |

---

## Vehicle Sales Finance - Code Verification

### Yutong Payment Tracking (YutongPaymentTracking.tsx)

| Feature | Status | Lines |
|---------|--------|-------|
| Finance hook imports | IMPLEMENTED | 20-28 |
| handleVerifyPayment with GL | IMPLEMENTED | 204-350 |
| Customer creation | IMPLEMENTED | 229-248 |
| AR Invoice creation | IMPLEMENTED | 251-273 |
| GL posting | IMPLEMENTED | 281-301 |
| AR Receipt creation | IMPLEMENTED | 304-321 |
| Order financials update | IMPLEMENTED | 352-381 |

### Sinotruck Payment Tracking (SinotruckPaymentTracking.tsx)

| Feature | Status | Notes |
|---------|--------|-------|
| Component created | YES | Full implementation |
| GL integration | YES | Uses useVehicleSalesFinance |
| Verify with posting | YES | handleVerifyPayment function |

### Light Vehicle Payment Tracking (LightVehiclePaymentTracking.tsx)

| Feature | Status | Notes |
|---------|--------|-------|
| Component created | YES | Full implementation |
| GL integration | YES | Uses useVehicleSalesFinance |
| Verify with posting | YES | handleVerifyPayment function |

---

## GL Posting Rules - Verification

### Special Hire (SPH)

| Transaction | Debit Account | Credit Account | Status |
|-------------|---------------|----------------|--------|
| Advance Payment | Bank (Asset) | Customer Advance (Liability) | CORRECT |
| Full Payment | Bank (Asset) | Revenue | CORRECT |
| Invoice Sent | Trade Receivable (Asset) | Revenue | CORRECT |
| Advance Applied | Customer Advance (Liability) | Trade Receivable (Asset) | CORRECT |
| Balance Payment | Bank (Asset) | Trade Receivable (Asset) | CORRECT |
| Refund | Customer Advance (Liability) | Bank (Asset) | CORRECT |

### Vehicle Sales (YUT/SNT/LTV)

| Transaction | Debit Account | Credit Account | Status |
|-------------|---------------|----------------|--------|
| Advance Payment | Bank | Customer Advance | CORRECT |
| Balance Payment | Bank | Trade Receivable | CORRECT |
| Full Payment | Bank | Sales Revenue | CORRECT |

---

## COA Balance Update Logic

```typescript
// From useSpecialHireFinance.ts lines 29-76
const netAmount = (line.debit || 0) - (line.credit || 0);
const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
const adjustment = isDebitNormal ? netAmount : -netAmount;
```

| Account Type | Normal Side | Debit Effect | Credit Effect | Status |
|--------------|-------------|--------------|---------------|--------|
| Asset | Debit | Increases | Decreases | CORRECT |
| Expense | Debit | Increases | Decreases | CORRECT |
| Liability | Credit | Decreases | Increases | CORRECT |
| Equity | Credit | Decreases | Increases | CORRECT |
| Revenue | Credit | Decreases | Increases | CORRECT |

---

## Implementation Summary

### Completed Tasks

1. Database schema for all vehicle finance settings tables
2. `useVehicleSalesFinance.ts` - Unified finance hook
3. `VehicleFinanceSettingsBase.tsx` - Settings UI component
4. Settings components for Yutong, Sinotruck, Light Vehicle
5. Payment tracking components for all three modules
6. Settings.tsx updated with 3 new finance tabs
7. EnhancedSinotrukOrderDetailsModal updated with SinotruckPaymentTracking
8. YutongPaymentTracking enhanced with GL posting
9. useSinotrukOrderManagement updated with verify function

### Pending Actions

1. **Fix the database trigger** (CRITICAL) - Missing `total_additional_charges`
2. **Configure Yutong finance settings** - Map GL accounts
3. **Configure Sinotruck finance settings** - Map GL accounts
4. **Configure Light Vehicle finance settings** - Map GL accounts
5. **Repair existing quotation balances** - Run data fix query

---

## Testing Checklist After Bug Fix

1. **Special Hire Advance Payment**
   - Record advance payment
   - Approve via Finance
   - Verify GL Entry: `SPH-ADV-xxx` with DR Bank / CR Advance
   - Verify AR Invoice created
   - Verify Customer created in Finance module
   - Verify COA balances updated

2. **Special Hire Balance Invoice**
   - Complete trip with adjustments (extra KM, expenses)
   - Generate balance invoice
   - Email to customer
   - Verify GL Entry: `SPH-INV-xxx` with DR Receivable / CR Revenue
   - Verify GL Entry: `SPH-ADV-APPLY-xxx` with DR Advance / CR Receivable
   - Verify balance_due calculation includes additional charges

3. **Special Hire Balance Payment**
   - Record balance payment
   - Approve via Finance
   - Verify GL Entry: `SPH-BAL-xxx` with DR Bank / CR Receivable
   - Verify AR Invoice status updated to 'paid'
   - Verify AR Receipt created

4. **Vehicle Sales (after configuration)**
   - Configure finance settings for Yutong
   - Record and verify payment
   - Check GL Entry with YUT tag
   - Check AR Invoice creation
   - Check COA balance updates

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_fix_balance_trigger.sql` | CREATE | Fix trigger to include total_additional_charges |

