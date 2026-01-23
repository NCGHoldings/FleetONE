
# Special Hire Module - Complete Finance Integration Plan

## Executive Summary

This plan addresses the gaps between Special Hire operations and the Finance ERP module by implementing a workflow similar to the School Bus module. The goal is to ensure:
1. Payments cannot be marked "paid" without generating a Sales Receipt
2. AR Invoices are created in the Finance module for full receivable tracking
3. GL entries are properly linked to AR records
4. All transactions flow smoothly with proper validation gates

---

## Current State Analysis

### What Works
| Component | Status |
|-----------|--------|
| GL posting on Finance Approval | ✅ Implemented |
| GL posting on Invoice Send | ✅ Implemented |
| Document storage (sales_receipt/invoice) | ✅ Implemented |
| Payment status workflow | ✅ Implemented |
| Quotation payment summary trigger | ✅ Implemented |

### What's Missing
| Gap | Impact |
|-----|--------|
| No AR Invoice created in Finance module | Cannot track receivables in Finance > Accounts Receivable |
| No mandatory Sales Receipt check | Finance can approve payment without receipt generated |
| No link between `document_storage` and `ar_invoices` | Documents exist but not connected to Finance AR |
| GL entries not linked to AR Invoice | Journal entries exist but AR tracking incomplete |
| No SPH customer creation in Finance | No customer records for SPH in Finance module |

---

## Proposed Architecture

### Complete Transaction Flow

```text
PHASE 1: QUOTATION CONFIRMED + ADVANCE PAYMENT
============================================
Step 1: Operations confirms payment → Creates special_hire_payments (pending_finance)
Step 2: Auto-generate Draft Sales Receipt → Stored in document_storage
Step 3: Finance approves payment:
   a. Check: Sales Receipt document exists (NEW VALIDATION)
   b. Create/Get Customer in Finance module (NEW)
   c. Create AR Invoice in ar_invoices table (NEW)
   d. Create GL Entry: DR Bank / CR Customer Advance
   e. Link AR Invoice to Journal Entry
   f. Update document_storage to 'approved'
   g. Update quotation.advance_paid via trigger

PHASE 2: TRIP COMPLETED + BALANCE INVOICE
=========================================
Step 4: Post-trip adjustments recorded
Step 5: Generate Balance Invoice (customer-facing)
Step 6: Send Invoice to Customer:
   a. Create/Update AR Invoice with full amount
   b. Create GL Entry: DR Trade Receivable / CR Revenue  
   c. Create GL Entry: DR Customer Advance / CR Receivable (apply advance)
   d. Update AR Invoice balance

PHASE 3: BALANCE PAYMENT
========================
Step 7: Customer pays balance → special_hire_payments created
Step 8: Finance approves:
   a. Create GL Entry: DR Bank / CR Trade Receivable
   b. Update AR Invoice: paid_amount, balance, status='paid'
   c. Create AR Receipt in ar_receipts table
```

---

## Database Changes Required

### 1. Add SPH Customer Linking
Add columns to `special_hire_quotations` to link to Finance customers:

```sql
ALTER TABLE special_hire_quotations
ADD COLUMN IF NOT EXISTS finance_customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES ar_invoices(id);
```

### 2. Add AR Links to Payments
Add columns to `special_hire_payments` for Finance integration:

```sql
ALTER TABLE special_hire_payments
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID REFERENCES ar_invoices(id),
ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES ar_receipts(id),
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id);
```

### 3. Create SPH Customer Auto-Creation Function

```sql
CREATE OR REPLACE FUNCTION create_or_get_sph_customer(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Try to find existing customer by phone or email
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = p_company_id
    AND (phone = p_customer_phone OR email = p_customer_email)
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      company_id, name, phone, email, 
      customer_type, business_unit_code, is_active
    )
    VALUES (
      p_company_id, p_customer_name, p_customer_phone, p_customer_email,
      'individual', 'SPH', true
    )
    RETURNING id INTO v_customer_id;
  END IF;
  
  RETURN v_customer_id;
END;
$$;
```

---

## Code Changes Required

### File 1: `src/hooks/useSpecialHireFinance.ts`

**Add new functions:**

1. `createOrGetSPHCustomer()` - Get/create customer in Finance module
2. `createSPHARInvoice()` - Create AR Invoice record
3. `updateSPHARInvoice()` - Update AR Invoice on payment
4. `createSPHARReceipt()` - Create AR Receipt record

### File 2: `src/hooks/useFinanceApproval.ts`

**Modify `approvePayment()` to:**

1. Validate that a draft document exists before approval
2. Create/get Finance customer
3. Create AR Invoice linked to quotation
4. Link GL entry to AR Invoice
5. Update special_hire_payments with ar_invoice_id and journal_entry_id

### File 3: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`

**Modify `handleEmailToCustomer()` to:**

1. Update existing AR Invoice with full invoice amount
2. Mark invoice as sent to customer
3. Properly apply advance to reduce AR balance

### File 4: `src/components/special-hire/PaymentConfirmationModal.tsx`

**Add validation to ensure:**

1. For advance payments: Draft receipt must be generated before closing modal
2. Add visual indicator showing document generation status

---

## New Validation Gates

### Gate 1: Payment Confirmation → Finance
**Location**: `ConfirmedTripsTable.tsx` in `handlePaymentConfirmation()`
**Rule**: Payment can only be created with `pending_finance` status if document was generated
**Implementation**: Check `docResult.success` before creating payment

### Gate 2: Finance Approval
**Location**: `useFinanceApproval.ts` in `approvePayment()`
**Rule**: Cannot approve if no `document_storage` record exists with status='draft'
**Implementation**: Query document_storage before allowing approval

### Gate 3: Invoice Sending
**Location**: `GenerateBalanceInvoiceModal.tsx` 
**Rule**: Invoice must be saved before sending
**Implementation**: Already exists (checks documentId)

---

## Integration Pattern (Following School Bus)

The School Bus module pattern will be replicated:

| School Bus | Special Hire (NEW) |
|------------|-------------------|
| `school_ar_invoices` → `ar_invoices` | `special_hire_payments` → `ar_invoices` |
| `journal_entry_id` field | `journal_entry_id` field |
| `ar_invoice_id` field | `ar_invoice_id` field |
| Individual student AR | Individual quotation AR |
| FIFO payment settlement | Direct payment matching |
| Auto-sync trigger | Direct update in approval hook |

---

## Complete File Modifications List

| File | Changes |
|------|---------|
| `supabase/migrations/new_sph_ar_integration.sql` | Add columns and functions |
| `src/hooks/useSpecialHireFinance.ts` | Add AR Invoice/Customer/Receipt functions |
| `src/hooks/useFinanceApproval.ts` | Add document validation, AR creation, linking |
| `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` | Update AR Invoice on send |
| `src/components/special-hire/ConfirmedTripsTable.tsx` | Ensure document generated before payment |
| `src/components/special-hire/PaymentConfirmationModal.tsx` | Add document status indicator |

---

## Expected Results After Implementation

### Finance Module View
- **Accounts Receivable**: Will show SPH invoices with business_unit_code='SPH'
- **Customers**: Will show SPH customers auto-created from quotations
- **Journal Entries**: Already shows SPH entries (existing)

### Special Hire Module
- Cannot mark payment without generating Sales Receipt
- Cannot re-mark if already processed (proper state management)
- Full audit trail linking payments → documents → AR → GL

### COA Impact
All SPH transactions properly reflected in:
- Trade Receivable account (increases/decreases)
- Customer Advance Receipt account (liability)
- Bank/Cash account
- Special Hire Revenue account

---

## Verification Checklist

After implementation:

1. **Create quotation** → Confirm → Record advance payment
2. **Verify draft Sales Receipt** created in document_storage
3. **Finance Approve** → Verify:
   - AR Invoice created in Finance module
   - Customer created/linked
   - GL Entry created with AR link
   - Document status changed to 'approved'
4. **Complete trip** → Add adjustments → Generate Balance Invoice
5. **Send Invoice** → Verify:
   - AR Invoice updated with full amount
   - GL entries created (Revenue + Advance Apply)
6. **Record balance payment** → Finance Approve → Verify:
   - AR Invoice status = 'paid'
   - GL Entry created
7. **Check Finance Module**:
   - Filter AR by business_unit_code = 'SPH'
   - Verify all SPH receivables visible
   - Verify COA balances correct
