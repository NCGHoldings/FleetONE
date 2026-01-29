

# Yutong Finance Integration - Proper Accounting Flow Redesign

## Current Problem Analysis

### Database Evidence:
| Issue | Current State | Expected |
|-------|---------------|----------|
| GL Entries | 0 YUT entries | Should post on payment verification |
| AR Invoices | 0 YUT invoices | Should create when **system invoice** is generated |
| Payments | All have `journal_entry_id: null` | Should link to GL entries |
| Finance Settings | `default_bank_account_id: null` | Must be configured |

### Root Cause:
The `yutong_finance_settings` table shows:
```text
default_bank_account_id: NULL  ← BLOCKING all GL posts
sales_revenue_account_id: NULL
trade_receivable_account_id: NULL
customer_advance_account_id: 09066ee1-... ← Only this is set
```

The code correctly checks for `default_bank_account_id` and fails silently when it's NULL.

---

## Proposed Accounting Flow (Proper Principles)

You are **100% correct** about the proper accounting flow:

### Standard Vehicle Sales Accounting Flow:

```text
STEP 1: Customer Payment (Cash Receipt)
─────────────────────────────────────────
When payment is received (before invoice):
  DR Bank/Cash Account          XXX
     CR Customer Advance (Liability)    XXX
→ Creates: GL Entry ONLY (no AR Invoice yet)

STEP 2: System Invoice Generation  
─────────────────────────────────────────
When official invoice is generated:
  DR Trade Receivable (Asset)   XXX
     CR Sales Revenue               XXX
→ Creates: AR Invoice + GL Entry (Revenue Recognition)

STEP 3: Apply Advance to Invoice
─────────────────────────────────────────
When advance is applied (delivery/settlement):
  DR Customer Advance (Liability) XXX
     CR Trade Receivable (Asset)     XXX
→ Creates: GL Entry (Advance Application)

STEP 4: Balance Payment (if any)
─────────────────────────────────────────
When remaining balance is paid:
  DR Bank/Cash Account          XXX
     CR Trade Receivable (Asset)    XXX
→ Creates: GL Entry + Updates AR Invoice status
```

### Key Principle Corrections:
1. **Cash Receipt ≠ AR Invoice** - Receipts only update GL (Bank vs Advance)
2. **AR Invoice = System Invoice** - Generated when formal invoice is issued
3. **Revenue Recognition** - Happens at invoice, not at payment
4. **Advance is a Liability** - Not revenue until invoice is raised

---

## Implementation Changes

### 1. Separate Cash Receipt GL from AR Invoice Creation

**File: `src/components/yutong/YutongPaymentTracking.tsx`**

Current `handleVerifyPayment` does:
1. ✓ Create Finance Customer
2. ✗ Create AR Invoice (WRONG - at payment time)
3. ✓ Post to GL
4. ✓ Create AR Receipt (but no invoice link)

New flow:
1. ✓ Create Finance Customer
2. ✗ REMOVE AR Invoice creation from here
3. ✓ Post to GL (DR Bank | CR Customer Advance)
4. ✗ REMOVE AR Receipt (no invoice to link)

**Updated Code Logic:**
```typescript
const handleVerifyPayment = async (paymentId: string) => {
  // 1. Create/Get Finance Customer
  let customerId = orderDetails?.finance_customer_id;
  if (!customerId && settings.auto_create_customer) {
    customerId = await createVehicleCustomer({...});
    await updateOrderFinanceLinks({...});
  }

  // 2. Post to GL ONLY (Bank vs Customer Advance)
  //    AR Invoice NOT created here
  let journalEntryId: string | undefined;
  if (settings.auto_post_on_verify) {
    const glResult = await postVehiclePaymentToGL({
      module: 'yutong',
      paymentType: 'advance', // Always advance until invoice
      ...
    });
    if (glResult) {
      journalEntryId = glResult.journalEntryId;
      toast.success(`GL Entry posted: ${glResult.entryNumber}`);
    }
  }

  // 3. Update payment status (NO ar_receipt_id - no invoice yet)
  await supabase.from('yutong_customer_payments').update({
    status: 'verified',
    journal_entry_id: journalEntryId,
    // ar_receipt_id removed
  }).eq('id', paymentId);
};
```

### 2. Create AR Invoice When System Invoice Generated

**File: `src/hooks/useYutongOrderInvoiceManagement.ts`**

Add AR Invoice creation in `generateAndStoreDraftInvoice` or `approveInvoice`:

```typescript
// When invoice is APPROVED (not draft)
const approveInvoice = async (invoiceId, documentId) => {
  // ... existing approval logic ...
  
  // NEW: Create AR Invoice in Finance module
  const arResult = await createVehicleARInvoice({
    module: 'yutong',
    orderId: invoice.order_id,
    orderNo: orderDetails.order_no,
    customerId: orderDetails.finance_customer_id,
    totalAmount: invoice.invoice_amount,
    advanceAmount: orderDetails.total_paid || 0,
    companyId: NCG_HOLDING_ID,
    settings,
  });

  if (arResult) {
    // Link AR Invoice to order
    await updateOrderFinanceLinks({
      module: 'yutong',
      orderId: invoice.order_id,
      arInvoiceId: arResult.invoiceId,
    });

    // Post Revenue Recognition GL Entry
    await postVehicleInvoiceToGL({
      module: 'yutong',
      orderNo,
      customerName,
      invoiceAmount: invoice.invoice_amount,
      settings,
      effectiveCompanyId: NCG_HOLDING_ID,
    });
  }
};
```

### 3. Add Required Account Validation with Clear Guidance

**File: `src/components/settings/VehicleFinanceSettingsBase.tsx`**

Show explicit error when accounts are missing:

```typescript
// Before save, validate required fields
const requiredFields = [
  { key: 'default_bank_account_id', label: 'Bank Account' },
  { key: 'customer_advance_account_id', label: 'Customer Advance Account' },
  { key: 'sales_revenue_account_id', label: 'Sales Revenue Account' },
  { key: 'trade_receivable_account_id', label: 'Trade Receivable Account' },
];

const missingFields = requiredFields.filter(f => !settings[f.key]);
if (missingFields.length > 0) {
  toast.error(`Required accounts missing: ${missingFields.map(f => f.label).join(', ')}`);
  return false;
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/yutong/YutongPaymentTracking.tsx` | Remove AR Invoice creation from payment verification; Only post GL entry (Bank vs Advance) |
| `src/hooks/useYutongOrderInvoiceManagement.ts` | Add AR Invoice + Revenue GL posting when system invoice is approved |
| `src/hooks/useVehicleSalesFinance.ts` | Add `postVehicleReceiptToGL` function for cash receipts (no AR) |
| `src/components/settings/VehicleFinanceSettingsBase.tsx` | Enhance validation to require all 4 key accounts |

---

## Proper Accounting Rules Followed

| Rule | Implementation |
|------|----------------|
| Cash Receipt ≠ Revenue | Payment creates GL only (DR Bank CR Advance), no AR Invoice |
| Revenue Recognition | Happens when invoice is approved, not when payment is received |
| Advance is Liability | Customer Advance Account is liability, reduces when applied to invoice |
| AR Invoice = Sales Invoice | Created when system generates official invoice, not on payment |
| Matching Principle | Revenue recognized when service/goods delivered (invoice approved) |

---

## User Action Required

Before this will work, you MUST configure these accounts in **Finance → Settings → Yutong Finance**:

| Account | Purpose | Account Type |
|---------|---------|--------------|
| Bank Account* | Receives cash payments | Asset |
| Customer Advance* | Holds advance payments until invoice | Liability |
| Sales Revenue* | Recognizes revenue when invoice approved | Revenue |
| Trade Receivable* | Tracks outstanding invoices | Asset |

*These are currently NULL and blocking all finance operations.

---

## Testing Checklist

1. Configure all 4 required accounts in Yutong Finance Settings
2. Record a new payment → Verify → Check GL shows Bank vs Advance entry
3. Generate and approve a system invoice → Check AR Invoice created
4. Check AR Invoice shows correct balance (Total - Advances)
5. Verify GL shows revenue recognition entry (Receivable vs Revenue)

