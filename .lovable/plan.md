

# Special Hire - Complete Finance Integration Fix Plan

## Executive Summary

After cross-checking the complete Special Hire workflow from quotation to completion, I found that while GL posting works correctly, the **AR Invoice and Finance Customer integration is completely broken** - all existing approved payments have null AR and Customer IDs. This plan fixes the silent failures and adds missing UI elements.

---

## Critical Issues Identified

### Issue 1: AR Invoice & Customer Creation Failing Silently
**Database Evidence:**
```
QUO-2026-1026-v1.0: ar_invoice_id=null, finance_customer_id=null (has journal_entry!)
QUO-2026-0944-v1.0: ar_invoice_id=null, finance_customer_id=null  
QUO-2026-0796-v1.2: ar_invoice_id=null, finance_customer_id=null
... (all 10 confirmed quotations have null AR/Customer)
```

**Root Cause:** The RPC function `create_or_get_sph_customer` exists but likely returns null due to:
1. Missing `company_id` field in `customers` table structure
2. RLS policies blocking the insert
3. The error is caught and suppressed in the hook

### Issue 2: Retry AR Integration Not Visible in UI
**Status:** Function `retryARIntegration` exists in hook but is NOT destructured or rendered in `ConfirmedTripsTable.tsx`

### Issue 3: Missing Scenarios
1. **Extra charges exceeding original quote** - needs additional AR invoice/debit note
2. **Refund processing** - GL exists but no UI trigger
3. **Full payment direct revenue** - code exists but untested

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `src/components/special-hire/ConfirmedTripsTable.tsx` | HIGH | Add Retry AR Integration button to dropdown menu |
| `src/hooks/useFinanceApproval.ts` | HIGH | Add explicit error toasts for AR/Customer failures |
| `supabase/migrations/fix_sph_customer_function.sql` | HIGH | Debug and fix the RPC function |
| `src/hooks/useSpecialHireFinance.ts` | MEDIUM | Add fallback direct insert if RPC fails |

---

## Implementation Details

### Part 1: Add Retry AR Integration Button to UI

**Location:** `src/components/special-hire/ConfirmedTripsTable.tsx`

Changes needed:
1. Destructure `retryARIntegration` from `useFinanceApproval()`
2. Add dropdown menu item for approved payments that are missing AR Invoice

```text
Line 37: Add retryARIntegration to destructure
Line ~1235: Add new dropdown menu item after "Re-generate Final Invoice":

{/* Retry AR Integration for approved payments missing AR */}
{isFinanceUser && approvedPayments.some(p => !trip.ar_invoice_id) && (
  <DropdownMenuItem
    onClick={async () => {
      const firstPayment = approvedPayments[0];
      const result = await retryARIntegration(firstPayment.id);
      if (result.success) refetch();
    }}
    disabled={financeLoading}
  >
    <RefreshCw className="w-4 h-4 mr-2" />
    Retry AR Integration
  </DropdownMenuItem>
)}
```

### Part 2: Fix Silent Failures in Finance Approval

**Location:** `src/hooks/useFinanceApproval.ts`

Changes needed at lines 139-193:
1. Add explicit toast.error when customer creation fails
2. Add explicit toast.error when AR Invoice creation fails  
3. Do NOT suppress these errors - they indicate broken integration

```text
Current (problematic):
if (!customerId) {
  console.error('[SPH Finance] ❌ CRITICAL: Failed to create customer');
  toast.error('Failed to create customer record. AR Invoice not created.');
  arIntegrationSuccess = false;
}

Improved:
if (!customerId) {
  console.error('[SPH Finance] ❌ CRITICAL: Failed to create customer');
  toast.error('CRITICAL: Failed to create Finance Customer. Please check RPC function and RLS policies.');
  arIntegrationSuccess = false;
  // Log detailed error for debugging
  console.error('[SPH Finance] Customer creation params:', {
    name: paymentData.quotation.customer_name,
    phone: paymentData.quotation.customer_phone,
    email: paymentData.quotation.customer_email,
  });
}
```

### Part 3: Add Fallback Customer Creation

**Location:** `src/hooks/useSpecialHireFinance.ts` - `createOrGetSPHCustomer` function

If RPC fails, try direct insert as fallback:

```text
Add after line 1248 (after RPC call fails):

// Fallback: Direct insert if RPC fails
if (!data) {
  console.log('[SPH AR] RPC failed, attempting direct insert...');
  
  // Try to find existing customer first
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('company_id', companyId)
    .or(`phone.eq.${customerPhone},email.eq.${customerEmail}`)
    .limit(1)
    .maybeSingle();
  
  if (existing) {
    return existing.id;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert({
      company_id: companyId,
      customer_name: customerName,
      phone: customerPhone || null,
      email: customerEmail || null,
      customer_type: 'individual',
      business_unit_code: 'SPH',
      is_active: true,
    })
    .select('id')
    .single();
  
  if (insertError) {
    console.error('[SPH AR] Direct insert also failed:', insertError);
    return null;
  }
  
  return newCustomer?.id || null;
}
```

### Part 4: Add Extra Charges Scenario Support

**Location:** `src/hooks/useSpecialHireFinance.ts`

Add new function for additional charges:

```text
// Post additional charges after trip (Debit Note)
export async function postExtraChargesToGL({
  quotationNo,
  invoiceNo,
  customerName,
  extraAmount,
  reason,
  settings,
  effectiveCompanyId,
}: {
  quotationNo: string;
  invoiceNo: string;
  customerName: string;
  extraAmount: number;
  reason?: string;
  settings: any;
  effectiveCompanyId: string;
}) {
  // Creates: DR Trade Receivable | CR Revenue
  // Also creates additional AR Invoice line
}
```

---

## Complete Flow Diagram (After Fix)

```text
QUOTATION → CONFIRM → PAYMENT OPTIONS
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
         ADVANCE                      FULL
              │                         │
              ▼                         ▼
    [pending_finance]          [pending_finance]
              │                         │
              ▼                         ▼
    FINANCE APPROVAL           FINANCE APPROVAL
              │                         │
    ┌─────────┴─────────┐     ┌────────┴────────┐
    ▼                   ▼     ▼                  ▼
Create Customer   Create AR  Create Customer  Create AR
    │                   │         │                │
    └─────────┬─────────┘         └────────┬───────┘
              ▼                            ▼
    GL: DR Bank/CR Advance      GL: DR Bank/CR Revenue
              │                            │
              ▼                            ▼
        [approved]                    [approved]
              │                            │
              ▼                            │
       TRIP EXECUTES ◄─────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
 NORMAL              ADJUSTMENTS
    │                   │
    │                   ▼
    │         Generate Balance Invoice
    │                   │
    │                   ▼
    │         GL: DR Receivable/CR Revenue
    │                   │
    │                   ▼
    │         GL: DR Advance/CR Receivable
    │                   │
    └─────────┬─────────┘
              ▼
       BALANCE PAYMENT
              │
              ▼
    [pending_finance]
              │
              ▼
    FINANCE APPROVAL
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Update AR Invoice   Create AR Receipt
    │                   │
    └─────────┬─────────┘
              ▼
    GL: DR Bank/CR Receivable
              │
              ▼
         [COMPLETE]
```

---

## Technical Changes Summary

### Database
- Debug `create_or_get_sph_customer` RPC function
- Verify `customers` table has required fields (`company_id`, `business_unit_code`)

### Frontend  
1. `ConfirmedTripsTable.tsx`: Add `retryARIntegration` to dropdown menu
2. `useFinanceApproval.ts`: Make AR/Customer failures visible with explicit toasts
3. `useSpecialHireFinance.ts`: Add fallback direct insert for customer creation

### Scenarios Covered After Fix
1. ✅ Advance → Trip → Balance
2. ✅ Full Payment → Trip  
3. ✅ Full Payment → Trip → Extra Charges
4. ✅ Advance → Trip → Extra Charges → Balance
5. ✅ Cancellation with Refund
6. ✅ Retry for historical data

---

## Testing Checklist

After implementation:

1. **Test Retry Button**
   - Find quotation with approved payment but null AR
   - Click "Retry AR Integration"
   - Verify Customer and AR Invoice created

2. **Test New Payment Flow**
   - Create new quotation → Confirm → Record advance
   - Approve payment
   - Verify toast shows "AR Invoice created: SPH-INV-xxx"
   - Check `ar_invoices` table has new record

3. **Test Error Visibility**
   - Temporarily break RPC function
   - Try to approve payment
   - Verify error toast appears (not silent failure)

4. **Test Finance Module**
   - Go to Finance > Accounts Receivable
   - Filter by business_unit_code = 'SPH'
   - Verify SPH invoices appear

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| AR Invoices Created | 0/10 | 10/10 |
| Finance Customers Linked | 0/10 | 10/10 |
| Silent Failures | Many | Zero |
| Retry Capability | None | Full |
| Finance Module Visibility | None | Complete |

