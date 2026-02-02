
# Finance ERP - Complete AR/AP Payment Flow Enhancement

## Current State Analysis

Based on code review, here are the identified gaps:

| Area | Current State | Issue |
|------|---------------|-------|
| AR Receipts Tab | Shows `AccountsReceivableView` (same as Invoices) | No dedicated receipts list view |
| AP Payments Tab | Shows `AccountsPayableView` (same as Invoices) | No dedicated payments list view |
| Advance Receipts | Query exists but form limited | Can't easily record standalone advance |
| Payment Recording | Only via "Receive" on invoice row | No standalone "Record Payment Coming" action |
| Full Payment Mark | Must allocate manually | No quick "Mark Full Payment" option |

---

## Proposed Architecture

```text
+------------------+     +-------------------+     +------------------+
|   AR Module      |     |   AP Module       |     |   Banking        |
+------------------+     +-------------------+     +------------------+
| Customers        |     | Vendors           |     | Bank Accounts    |
| Invoices (List)  |     | Invoices (List)   |     | Transactions     |
| Receipts (NEW)   |     | Payments (NEW)    |     | Reconciliation   |
| Credit Notes     |     | Debit Notes       |     | Cheque Register  |
| Advance Alloc    |     | Advance Alloc     |     | Cashbook         |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+---------------------------------------------------------------+
|                    General Ledger (GL)                        |
|  - Journal Entries auto-created on receipt/payment posting    |
|  - DR Bank / CR Trade Receivable (AR Receipt)                 |
|  - DR Trade Payable / CR Bank (AP Payment)                    |
+---------------------------------------------------------------+
```

---

## Implementation Plan

### Phase 1: Create Dedicated AR Receipts View

**New File:** `src/components/accounting/ARReceiptsView.tsx`

Features:
- List all AR Receipts with customer name, date, amount, method, status
- Summary cards: Total Receipts Today, This Month, Outstanding Advances
- "Record Receipt" button - opens `ARReceiptForm` without preselected invoice
- "Record Advance Receipt" button - records receipt as advance (no invoice allocation)
- Search/filter by customer, date range, payment method
- Actions per row: View, Print, Allocate (if unallocated/advance)

### Phase 2: Create Dedicated AP Payments View

**New File:** `src/components/accounting/APPaymentsView.tsx`

Features:
- List all AP Payments with vendor name, date, amount, method, cheque#, status
- Summary cards: Total Payments Today, This Month, Outstanding Advances
- "Record Payment" button - opens `APPaymentForm` without preselected invoice
- "Record Advance Payment" button - records payment as advance (no invoice allocation)
- Search/filter by vendor, date range, payment method
- Actions per row: View, Print, Allocate (if unallocated/advance)

### Phase 3: Enhanced Receipt/Payment Forms

**Updates to `ARReceiptForm.tsx`:**
- Add "Is Advance Receipt" checkbox (saves to `is_advance` column)
- When checked: skip invoice allocation section, full amount as advance
- Add "Mark Full Payment" quick button that auto-fills allocation for full balance

**Updates to `APPaymentForm.tsx`:**
- Add "Is Advance Payment" checkbox (saves to `is_advance` column)
- When checked: skip invoice allocation section, full amount as advance
- Add "Mark Full Payment" quick button that auto-fills allocation for full balance

### Phase 4: Update Accounting Page Routing

**File:** `src/pages/Accounting.tsx`

Change AR "Receipts" tab content:
```typescript
<TabsContent value="receipts">
  <ARReceiptsView />  // Changed from AccountsReceivableView
</TabsContent>
```

Change AP "Payments" tab content:
```typescript
<TabsContent value="payments">
  <APPaymentsView />  // Changed from AccountsPayableView
</TabsContent>
```

### Phase 5: Fix Query Invalidation

**File:** `src/hooks/useAccountingMutations.ts`

Ensure these queries are invalidated after receipt/payment creation:
- `ar-invoices` (updates paid_amount, balance, status)
- `ar-receipts` (new receipt appears)
- `ap-invoices` (updates paid_amount, balance, status)
- `ap-payments` (new payment appears)
- `accounting-summary` (totals refresh)

---

## Data Flow Diagram

```text
PAYMENT INCOMING (AR Receipt):
+---------------+    +------------------+    +----------------+
| Customer Pays |    | Record Receipt   |    | Auto-Update    |
| (Bank/Cash)   | -> | (with allocation)| -> | Invoice Status |
+---------------+    +------------------+    +----------------+
                             |
                             v
                     +------------------+
                     | GL Entry Created |
                     | DR Bank          |
                     | CR Trade Recv    |
                     +------------------+

PAYMENT OUTGOING (AP Payment):
+---------------+    +------------------+    +----------------+
| Pay Vendor    |    | Record Payment   |    | Auto-Update    |
| (Bank/Cheque) | -> | (with allocation)| -> | Invoice Status |
+---------------+    +------------------+    +----------------+
                             |
                             v
                     +------------------+
                     | GL Entry Created |
                     | DR Trade Payable |
                     | CR Bank          |
                     +------------------+

ADVANCE RECEIPT/PAYMENT:
+---------------+    +------------------+    +----------------+
| Receive/Pay   |    | Record as Advance|    | No Invoice     |
| Advance       | -> | (is_advance=true)| -> | Allocation Yet |
+---------------+    +------------------+    +----------------+
                             |
                             v
                     +------------------+
                     | Later: Allocate  |
                     | via Advance      |
                     | Allocation View  |
                     +------------------+
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `ARReceiptsView.tsx` | Dedicated view for AR Receipts listing |
| `APPaymentsView.tsx` | Dedicated view for AP Payments listing |

## Files to Modify

| File | Changes |
|------|---------|
| `Accounting.tsx` | Update tab routing for Receipts/Payments |
| `ARReceiptForm.tsx` | Add advance checkbox, mark full payment button |
| `APPaymentForm.tsx` | Add advance checkbox, mark full payment button |
| `useAccountingMutations.ts` | Verify all query invalidations are complete |
| `AdvanceAllocationForm.tsx` | Improve UX and fix customer name lookup |

---

## Summary of New Capabilities

After implementation:

1. **Record Payment Coming (AR)**: Standalone receipt recording without invoice pre-selection
2. **Record Payment Outgoing (AP)**: Standalone payment recording without invoice pre-selection  
3. **Advance Receipts**: Record customer advances for later allocation
4. **Advance Payments**: Record vendor prepayments for later allocation
5. **Mark Full Payment**: One-click allocation of entire invoice balance
6. **Proper Data Refresh**: All views auto-update when transactions recorded
7. **Dedicated Views**: Separate lists for Receipts and Payments with full CRUD
