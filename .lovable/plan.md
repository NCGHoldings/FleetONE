

# Fix Missing "Apply Advance" Journal Entry in Special Hire GL Flow

## Problem

When a Special Hire trip has advance + balance payments, the system creates 3 JEs but is **missing the 4th critical entry** that clears the Customer Advance liability against Trade Receivable.

**Current (broken) for QUO-0693 (41,923 total):**

```text
JE #1 (Advance):     DR Bank 20,961.50        / CR Customer Advance 20,961.50  ✅
JE #2 (AR Invoice):  DR Trade Receivable 41,923 / CR Revenue 41,923             ✅
JE #3 (Balance):     DR Bank 20,961.50        / CR Trade Receivable 20,961.50   ✅
JE #4 (Apply Adv):   DR Customer Advance 20,961.50 / CR Trade Receivable 20,961.50  ❌ MISSING

Result: Customer Advances stuck at 20,961.50 CR (should be 0)
        Trade Receivable stuck at 20,961.50 DR (should be 0)
```

**Root cause:** The advance application code exists in `GenerateBalanceInvoiceModal.tsx` line 499-517 but only runs inside `handleEmailToCustomer`. Meanwhile, the balance payment GL posting happens in `useFinanceApproval.ts` line 216-228 during payment approval -- which never triggers advance application.

The advance application must fire when the **AR Invoice is created** (at balance payment approval time), not when the email is sent.

## Correct Full Accounting Sequence

```text
1. Advance Payment Approved:
   DR Bank           / CR Customer Advance     (cash received, liability created)

2. Balance Payment Approved → AR Invoice Created:
   DR Trade Receivable / CR Revenue             (revenue recognized)
   DR Customer Advance / CR Trade Receivable    (apply advance against invoice)  ← ADD THIS
   DR Bank            / CR Trade Receivable     (balance payment clears remaining)

Final balances: Bank +41,923 | Revenue -41,923 | Advance 0 | Receivable 0  ✅
```

## Changes

### File 1: `src/hooks/useFinanceApproval.ts`

After the balance payment GL posting (line 228), add advance application logic:

- Query `special_hire_payments` for this quotation's approved advance payments (where `payment_type = 'advance'` and `status = 'approved'`)
- Sum their amounts to get `totalAdvancePaid`
- If `totalAdvancePaid > 0`, call `applyAdvanceToInvoiceStandalone()` to create the missing JE:
  - DR Customer Advance (Liability decreases)
  - CR Trade Receivable (Asset decreases)
- This ensures every balance payment approval that creates an AR Invoice also clears the advance

### File 2: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`

- Add a double-posting guard for the advance application in `handleEmailToCustomer` (line 499-517)
- Before calling `applyAdvanceToInvoiceStandalone()`, check if an `SPH-ADJ-APPLY` JE already exists for this quotation
- If it exists (was already created during payment approval), skip to prevent duplicate entries
- Also use `freshTotalPaid` (from PaymentTimeline) instead of stale `quotationData.advance_paid` to get accurate advance amount

### File 3: `src/hooks/useSpecialHireFinance.ts`

- Add a new standalone function `getApprovedAdvanceTotal()` that queries the DB for sum of all approved advance payments for a quotation
- This ensures both `useFinanceApproval.ts` and `GenerateBalanceInvoiceModal.tsx` use the same source of truth for advance amounts

## Technical Detail

**New code in `useFinanceApproval.ts` after line 228:**
```typescript
// After balance GL posted, apply any advance payments against the AR Invoice
if (isBalance) {
  const { data: advancePayments } = await supabase
    .from('special_hire_payments')
    .select('amount')
    .eq('quotation_id', paymentData.quotation.id)
    .eq('payment_type', 'advance')
    .eq('status', 'approved');
  
  const totalAdvance = (advancePayments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  
  if (totalAdvance > 0) {
    const applyResult = await applyAdvanceToInvoiceStandalone({
      invoiceNo: arInvoiceNumber,
      quotationNo: paymentData.quotation.quotation_no,
      customerName: paymentData.quotation.customer_name,
      advanceAmount: totalAdvance,
      settings,
      effectiveCompanyId: NCG_HOLDING_ID,
    });
    // Log and toast
  }
}
```

**Guard in `GenerateBalanceInvoiceModal.tsx` line 499:**
```typescript
// Check if advance was already applied (by useFinanceApproval)
const { data: existingApplyJE } = await supabase
  .from('journal_entries')
  .select('id')
  .ilike('entry_number', `SPH-ADJ-APPLY-${quotationData.quotation_no}%`)
  .limit(1)
  .maybeSingle();

if (!existingApplyJE && quotationData.advance_paid > 0) {
  // ... existing apply advance code
}
```

## Summary

- Add advance application JE (DR Customer Advance / CR Trade Receivable) when balance payment is approved
- Add double-posting guard in email handler so advance isn't applied twice
- Create helper to query actual advance total from DB
- Result: all 4 required JEs fire correctly, Customer Advances and Trade Receivable both clear to zero

