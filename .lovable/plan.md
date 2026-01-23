

# Special Hire Finance Integration - Debug and Fix Plan

## Issues Identified

### Issue 1: Payment Proof Upload Failing
**Error**: "Upload failed - please try again"

**Root Cause**: The `payment-proofs` storage bucket has conflicting RLS policies. There are two sets of policies:
1. **Original policies** (Sept 2025): Role-aware policies that check `owner = auth.uid()` or specific roles
2. **Newer policies** (Dec 2025): Simplified policies allowing all authenticated users

These policies may conflict, causing the upload to fail for users without the `owner` relationship established.

**Fix Required**:
- Create a migration to consolidate storage policies
- Remove conflicting policies and keep only the simplified authenticated access

---

### Issue 2: GL Entries Not Being Created
**Problem**: When Finance approves Special Hire payments, no journal entries are posted to the General Ledger despite:
- Finance Settings configured correctly (NCG Holding)
- Auto-posting enabled for advance and balance payments
- GL account mappings in place

**Root Cause Analysis**:
The `useFinanceApproval.ts` hook has GL posting code, but:
1. The code was just deployed - need to verify it's actually running
2. Any errors in GL posting are caught silently with `toast.warning`
3. The approved payment at `2026-01-23 11:41:14` may have been approved before the code was fully deployed

**Fix Required**:
- Add better error logging to GL posting
- Add a manual "Post to GL" button for payments approved before integration
- Test by approving a new payment

---

### Issue 3: Invoice GL Posting Not Integrated
**Problem**: The `GenerateBalanceInvoiceModal` does NOT call the invoice GL posting functions when an invoice is sent to customer.

**Missing Integration**:
- `postInvoiceToGLStandalone()` - for DR Trade Receivable / CR Revenue
- `applyAdvanceToInvoiceStandalone()` - for DR Customer Advance / CR Trade Receivable

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration file | Fix storage policies for payment-proofs bucket |
| `src/hooks/useFinanceApproval.ts` | Improve error logging for GL posting |
| `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` | Add invoice GL posting when sent to customer |
| `src/components/special-hire/PendingPaymentsView.tsx` (optional) | Add manual "Retry GL Posting" button |

---

## Implementation Details

### Part 1: Fix Storage Policies

Create a new migration to consolidate payment-proofs bucket policies:

```sql
-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and finance/admin can read proofs" ON storage.objects;
DROP POLICY IF EXISTS "Owners and finance/admin can delete proofs" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "payment_proofs_delete_policy" ON storage.objects;

-- Create clean, unified policies
CREATE POLICY "payment_proofs_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_authenticated_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs')
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');
```

---

### Part 2: Improve GL Posting Error Handling

Update `useFinanceApproval.ts` to log detailed errors:

```typescript
// In the GL posting try-catch block
try {
  const settings = await fetchSpecialHireFinanceSettings(NCG_HOLDING_ID);
  console.log('SPH Finance Settings loaded:', settings ? 'Found' : 'Not found');
  
  if (settings) {
    // ... existing logic ...
    
    if (glResult) {
      console.log('GL Entry created:', glResult.entry_number);
    } else {
      console.warn('GL posting returned null - accounts may not be configured');
    }
  }
} catch (glError: any) {
  console.error('GL posting failed:', glError?.message || glError);
  toast.warning(`Payment approved but GL posting failed: ${glError?.message}`);
}
```

---

### Part 3: Add Invoice GL Posting

Update `GenerateBalanceInvoiceModal.tsx` to post GL entries when invoice is sent:

```typescript
// Add import
import { 
  fetchSpecialHireFinanceSettings,
  postInvoiceToGLStandalone,
  applyAdvanceToInvoiceStandalone 
} from '@/hooks/useSpecialHireFinance';
import { NCG_HOLDING_ID } from '@/contexts/CompanyContext';

// In handleEmailToCustomer, after updating invoice status:
try {
  const settings = await fetchSpecialHireFinanceSettings(NCG_HOLDING_ID);
  
  if (settings?.auto_post_invoices) {
    const fullInvoiceAmount = quotationData.original_quotation_amount + 
      (adjustmentData.extra_km_total_charge || 0) + 
      (adjustmentData.total_additional_expenses || 0);
    
    // 1. Post invoice (Revenue recognition)
    // DR Trade Receivable | CR Special Hire Revenue
    await postInvoiceToGLStandalone({
      invoiceNo: invoiceData.invoiceNo,
      quotationNo: quotationData.quotation_no,
      customerName: quotationData.customer_name,
      totalAmount: fullInvoiceAmount,
      isInternal: quotationData.company_name?.toLowerCase().includes('internal'),
      settings,
      effectiveCompanyId: NCG_HOLDING_ID,
    });
    
    // 2. Apply advance if customer paid advance
    // DR Customer Advance (Liability) | CR Trade Receivable
    if (quotationData.advance_paid > 0) {
      await applyAdvanceToInvoiceStandalone({
        invoiceNo: invoiceData.invoiceNo,
        quotationNo: quotationData.quotation_no,
        customerName: quotationData.customer_name,
        advanceAmount: quotationData.advance_paid,
        settings,
        effectiveCompanyId: NCG_HOLDING_ID,
      });
    }
    
    toast.success('Invoice posted to General Ledger');
  }
} catch (glError) {
  console.error('Invoice GL posting failed:', glError);
  toast.warning('Invoice sent but GL posting failed. Check Finance Settings.');
}
```

---

## Complete Transaction Flow After Fix

```text
Step 1: ADVANCE PAYMENT RECEIVED (Finance Approves)
┌─────────────────────────────────────────────┐
│ DR  Bank Account (Asset)        Amount      │
│ CR  Customer Advance (Liability)     Amount │
└─────────────────────────────────────────────┘
Triggered by: useFinanceApproval.ts

Step 2: INVOICE SENT TO CUSTOMER (Revenue Recognition)
┌─────────────────────────────────────────────┐
│ DR  Trade Receivable (Asset)    Full Amount │
│ CR  Special Hire Revenue             Amount │
└─────────────────────────────────────────────┘
Triggered by: GenerateBalanceInvoiceModal.tsx

Step 3: ADVANCE APPLIED TO INVOICE
┌─────────────────────────────────────────────┐
│ DR  Customer Advance (Liability)    Advance │
│ CR  Trade Receivable (Asset)         Advance│
└─────────────────────────────────────────────┘
Triggered by: GenerateBalanceInvoiceModal.tsx

Step 4: BALANCE PAYMENT RECEIVED (Finance Approves)
┌─────────────────────────────────────────────┐
│ DR  Bank Account (Asset)        Balance     │
│ CR  Trade Receivable (Asset)        Balance │
└─────────────────────────────────────────────┘
Triggered by: useFinanceApproval.ts
```

---

## Verification Checklist

After implementation:

1. **Upload Test**: Upload payment proof in PaymentConfirmationModal - should succeed
2. **Advance GL Test**: Approve a pending advance payment → Check Journal Entries for SPH-ADV entry
3. **Invoice GL Test**: Send balance invoice → Check Journal Entries for SPH-INV and SPH-ADV-APPLY entries
4. **Balance GL Test**: Approve balance payment → Check Journal Entries for SPH-BAL entry
5. **COA Balances**: Verify chart_of_accounts balances updated correctly
6. **Business Unit Filter**: Filter Journal Entries by `business_unit_code = 'SPH'` to see all Special Hire entries

