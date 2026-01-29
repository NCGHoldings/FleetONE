

# School Bus Finance Integration - Complete System Audit & Fix

## Executive Summary

The School Bus finance integration has several issues that need fixing:

1. **AR Invoice Sync Issue**: When payments are made, `school_ar_invoices` is updated correctly, but `ar_invoices` (Finance module) is NOT updated when `ar_invoice_id` is NULL on old records
2. **GL Posting Working**: Payment GL entries ARE being created correctly (SBS-PAY entries visible)
3. **Expense GL Not Active**: Expense GL posting is implemented but `auto_post_expenses` is disabled and expense accounts are not configured
4. **Missing Trigger Coverage**: The `sync_school_ar_to_finance_trigger` only fires on UPDATE - if `ar_invoice_id` was NULL when the school invoice was created, payments never sync to Finance AR

---

## Current System Flow Analysis

### Revenue Flow (AR Invoices & Payments)

| Step | Current Status | Issue |
|------|---------------|-------|
| 1. Create AR Invoice Batch | Working | GL Entry created (DR Receivable / CR Revenue) |
| 2. Link to Finance AR | Partial | Some old batches have `ar_invoice_id: NULL` |
| 3. Record Payment | Working | Payment saved to `school_payment_transactions` |
| 4. GL Payment Entry | Working | SBS-PAY journal entries posted (DR Bank / CR Receivable) |
| 5. FIFO Settlement | Working | `apply_payment_to_invoices()` updates `school_ar_invoices` |
| 6. Sync to Finance AR | **BROKEN** | Trigger fires, but if `ar_invoice_id IS NULL`, nothing happens |

### Expense Flow

| Step | Current Status | Issue |
|------|---------------|-------|
| 1. Record Route Expense | Working | Saved to `route_expenses` table |
| 2. GL Expense Entry | **Not Active** | `auto_post_expenses: false` in all settings |
| 3. Expense Account Mapping | **Not Configured** | All expense account IDs are NULL |

---

## Database Evidence

### Problem 1: School Invoices Without Finance AR Link
```text
ID: 3ae8cc11-ef4c-45ee-bb56-dfa9465ba7de
Student: A.A.Lihen Aradhya Amarathunga
Paid Amount: 10,200 LKR
ar_invoice_id: NULL  ← Payment can't sync to Finance AR
```

### Problem 2: Expense Settings Not Configured
```text
auto_post_expenses: false
fuel_expense_account_id: NULL
maintenance_expense_account_id: NULL
salary_expense_account_id: NULL
expense_cash_account_id: NULL
```

### Working Evidence
```text
Journal Entries with SBO:
- SBS-JE-20260129-C6A0: School Bus AR - 5,900 LKR
- SBS-PAY-20260123-XCHS: School Bus Payment - 7,275 LKR
- 15+ GL entries correctly tagged with business_unit_code: 'SBO'
```

---

## Root Cause Analysis

### Issue 1: AR Invoice Not Updating
The `sync_school_ar_to_finance_ar` trigger function checks:
```sql
IF v_ar_invoice_id IS NULL THEN
  RETURN NEW;  -- Exits early, does nothing
END IF;
```

**Cause**: Some `school_ar_invoices` were created before the AR Invoice creation was added, so they have `ar_invoice_id: NULL`.

### Issue 2: Expense GL Not Posting
The `usePostExpenseToGL` hook correctly checks:
```typescript
if (!effectiveSettings?.auto_post_expenses) {
  return null; // Skip GL posting
}
```

**Cause**: `auto_post_expenses` is `false` and expense accounts are not configured.

---

## Solution Plan

### Fix 1: Backfill Missing AR Invoice Links (Code Change)
Add a function to retroactively create Finance AR Invoices for school invoices that are missing the link.

**File: `src/hooks/useSchoolBusFinance.ts`**

Add new function `useBackfillARInvoiceLinks`:
- Query `school_ar_invoices` where `ar_invoice_id IS NULL`
- For each, create corresponding `ar_invoices` record
- Update `school_ar_invoices.ar_invoice_id` with the new ID
- This allows the sync trigger to work for future payments

### Fix 2: Enhanced Payment Recording (Code Change)
Update `RecordPaymentModal.tsx` to handle cases where `ar_invoice_id` is NULL:

**File: `src/components/school/RecordPaymentModal.tsx`**

After payment is recorded and FIFO settlement done:
1. Check if any `school_ar_invoices` updated by FIFO have `ar_invoice_id IS NULL`
2. If so, manually update the corresponding `ar_invoices` record OR create one
3. This ensures real-time sync even for legacy data

### Fix 3: Expense GL Integration (UI + Code)
Enable and configure expense posting:

**File: `src/components/school/SchoolBusFinanceSettings.tsx`**
- Add validation to ensure expense accounts are configured before enabling auto-post
- Show warning badge when expense posting is enabled but accounts are not configured

**File: `src/hooks/useSchoolBusExpense.ts`**
- Already implemented correctly - just needs configuration

### Fix 4: Add AR Sync Verification Button (UI)
Add a "Verify Finance Sync" button in School Bus module to:
- Check for orphaned school invoices (no AR link)
- Report sync status
- Trigger backfill if needed

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSchoolBusFinance.ts` | Add `useBackfillARInvoiceLinks` function, add `useSyncPaymentToFinanceAR` helper |
| `src/components/school/RecordPaymentModal.tsx` | After FIFO payment, manually update Finance AR if `ar_invoice_id` was NULL |
| `src/components/school/SchoolBusFinanceSettings.tsx` | Add validation for expense accounts, add "Verify Sync" button |
| `src/pages/SchoolBus.tsx` (or relevant view) | Add sync verification/repair UI |

---

## Implementation Details

### 1. Add AR Invoice Backfill Function

```typescript
// In useSchoolBusFinance.ts
export function useBackfillARInvoiceLinks() {
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async () => {
      // 1. Find school_ar_invoices without ar_invoice_id
      const { data: orphaned } = await supabase
        .from("school_ar_invoices")
        .select("*, student:school_students(student_name)")
        .is("ar_invoice_id", null)
        .eq("status", "posted");
      
      if (!orphaned?.length) return { fixed: 0 };
      
      let fixedCount = 0;
      for (const inv of orphaned) {
        // 2. Create Finance AR Invoice
        const { data: arInv } = await supabase
          .from("ar_invoices")
          .insert({
            company_id: getEffectiveCompanyId(),
            business_unit_code: getBusinessUnitCode() || 'SBO',
            invoice_number: inv.invoice_number,
            total_amount: inv.amount,
            balance: inv.amount - (inv.paid_amount || 0),
            paid_amount: inv.paid_amount || 0,
            status: inv.status === 'paid' ? 'paid' : inv.paid_amount > 0 ? 'partial' : 'unpaid',
            // ... other fields
          })
          .select()
          .single();
        
        if (arInv) {
          // 3. Link back to school invoice
          await supabase
            .from("school_ar_invoices")
            .update({ ar_invoice_id: arInv.id })
            .eq("id", inv.id);
          fixedCount++;
        }
      }
      return { fixed: fixedCount };
    }
  });
}
```

### 2. Update Payment Recording to Handle Legacy Data

```typescript
// In RecordPaymentModal.tsx - after FIFO settlement
// Check if any updated invoices need AR sync
const { data: updatedInvoices } = await supabase
  .from("school_ar_invoices")
  .select("id, ar_invoice_id, paid_amount, amount, status")
  .eq("student_id", student.id)
  .is("ar_invoice_id", null)
  .in("status", ["paid", "partial"]);

// If there are orphaned invoices with payments, create AR invoices for them
if (updatedInvoices?.length) {
  // Call backfill for these specific invoices
  for (const inv of updatedInvoices) {
    // Create or update Finance AR Invoice...
  }
}
```

### 3. Expense Settings Validation

```typescript
// In SchoolBusFinanceSettings.tsx
const validateExpenseSettings = () => {
  if (defaultSettings.auto_post_expenses) {
    const missing = [];
    if (!defaultSettings.expense_account_id) missing.push('General Expense');
    if (!defaultSettings.expense_cash_account_id) missing.push('Cash/Bank for Expenses');
    
    if (missing.length > 0) {
      toast.error(`Configure these accounts first: ${missing.join(', ')}`);
      return false;
    }
  }
  return true;
};
```

---

## Complete Finance Flow After Fix

```text
REVENUE FLOW:
┌─────────────────────────┐
│ 1. Generate AR Batch    │
│    - Creates school_ar_invoices
│    - Creates ar_invoices (Finance)
│    - Creates GL Entry (DR Receivable / CR Revenue)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Record Payment       │
│    - Creates school_payment_transactions
│    - Creates GL Entry (DR Bank / CR Receivable)
│    - FIFO applies to school_ar_invoices
│    - Trigger syncs to ar_invoices
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Verification         │
│    - All ar_invoices show correct balance
│    - COA balances updated
│    - Business unit tagged as SBO
└─────────────────────────┘

EXPENSE FLOW:
┌─────────────────────────┐
│ 1. Add Route Expense    │
│    - Creates route_expenses record
│    - If auto_post_expenses = true:
│      → Creates GL Entry (DR Expense / CR Cash)
│      → Updates COA balances
└─────────────────────────┘
```

---

## Testing Checklist

### Revenue Testing
1. Configure Finance Settings with all required accounts
2. Generate a new AR invoice batch for 2-3 students
3. Verify AR Invoices appear in Finance module
4. Record payment for one student
5. Verify:
   - `school_ar_invoices.paid_amount` updated
   - `school_ar_invoices.status` = 'paid' or 'partial'
   - `ar_invoices.paid_amount` updated (sync trigger worked)
   - `ar_invoices.balance` reduced
   - GL Entry created (SBS-PAY-xxx)
   - COA balances updated

### Expense Testing
1. Enable `auto_post_expenses` in School Bus Finance Settings
2. Configure expense accounts (Fuel, Maintenance, General, Cash)
3. Add a fuel expense to a route
4. Verify:
   - `route_expenses` record created
   - GL Entry created (SBS-EXP-xxx)
   - COA balances updated (Expense increased, Cash decreased)

### Backfill Testing
1. Run "Verify Finance Sync" to identify orphaned invoices
2. Run backfill function
3. Verify orphaned invoices now have `ar_invoice_id`
4. Make a payment on previously orphaned invoice
5. Verify Finance AR now updates correctly

---

## User Configuration Required

Before the system works correctly, ensure these are configured in **Settings → School Bus Finance**:

**Revenue Accounts:**
- Trade Receivable Account (Asset)
- SBS Collection Revenue Account (Revenue)
- Cash/Bank Account (Asset)

**Expense Accounts:**
- General Expense Account
- Fuel Expense Account
- Maintenance Expense Account
- Salary Expense Account
- Cash/Bank Account for Expenses

**Toggles:**
- Auto-Post Invoices to GL: ON
- Auto-Post Payments to GL: ON
- Auto-Post Expenses to GL: ON (after configuring expense accounts)

