

# School Bus Section — Full Operations & Finance Audit

## Audit Summary: Current Status

The School Bus section has a **well-built** operation-to-finance pipeline. Here is the complete flow analysis and findings.

---

## Complete System Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SCHOOL BUS OPERATIONS (SBO)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ BRANCHES     │───>│ ROUTES       │───>│ STUDENTS     │───>│ BUSES        │  │
│  │ school_      │    │ bus_routes   │    │ school_      │    │ buses        │  │
│  │ branches     │    │              │    │ students     │    │ (fleet)      │  │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘    └──────────────┘  │
│                             │                    │                              │
│                             │                    │                              │
│          EXPENSES           │      REVENUE       │                              │
│  ┌──────────────────────────┤  ┌─────────────────┤                              │
│  │                          │  │                  │                              │
│  ▼                          │  ▼                  ▼                              │
│  ┌──────────────┐           │  ┌──────────────┐  ┌──────────────┐              │
│  │ ROUTE        │           │  │ BULK AR      │  │ RECORD       │              │
│  │ EXPENSES     │           │  │ INVOICING    │  │ PAYMENT      │              │
│  │ route_       │           │  │ (per-student) │  │ school_      │              │
│  │ expenses     │           │  └──────┬───────┘  │ payment_txns │              │
│  └──────┬───────┘           │         │          └──────┬───────┘              │
│         │                   │         │                  │                      │
│  ┌──────┼───────┐           │         │                  │                      │
│  │ STAFF COSTS  │           │         │                  │                      │
│  │ route_staff_ │           │         │                  │                      │
│  │ costs        │           │         │                  │                      │
│  └──────┬───────┘           │         │                  │                      │
│         │                   │         │                  │                      │
└─────────┼───────────────────┼─────────┼──────────────────┼──────────────────────┘
          │                   │         │                  │
          │ AUTO GL POST      │         │ AUTO GL POST     │ AUTO GL POST
          ▼                   │         ▼                  ▼
┌─────────────────────────────┼──────────────────────────────────────────────────┐
│                      FINANCE / GL LAYER                                        │
│                                                                                 │
│  ┌────────────────────┐     │  ┌────────────────────┐  ┌────────────────────┐  │
│  │ EXPENSE GL POST    │     │  │ AR INVOICE CREATE  │  │ PAYMENT GL POST   │  │
│  │                    │     │  │                    │  │                    │  │
│  │ DR: Expense Acct   │     │  │ DR: Trade Recv     │  │ DR: Bank/Cash     │  │
│  │ CR: Cash/Bank      │     │  │ CR: SBS Collection │  │ CR: Trade Recv    │  │
│  │                    │     │  │                    │  │ CR: Advance Liab  │  │
│  │ + COA balance upd  │     │  │ + COA balance upd  │  │   (if overpay)    │  │
│  └─────────┬──────────┘     │  │ + Auto advance     │  │ + COA balance upd │  │
│            │                │  │   application      │  └─────────┬──────────┘  │
│            │                │  └─────────┬──────────┘            │              │
│            ▼                │            ▼                       ▼              │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     JOURNAL ENTRIES (journal_entries)                      │  │
│  │                     JOURNAL LINES  (journal_entry_lines)                  │  │
│  │                     COA BALANCES   (chart_of_accounts)                    │  │
│  │                     Tagged: business_unit_code = 'SBO'                    │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────────────────────┐        ┌────────────────────┐                          │
│  │ FINANCE AR         │<───────│ SCHOOL AR          │                          │
│  │ ar_invoices        │  link  │ school_ar_invoices  │                          │
│  │ (per-student)      │        │ (per-student)       │                          │
│  └────────────────────┘        └────────────────────┘                          │
│                                                                                 │
│  ┌────────────────────┐        ┌────────────────────┐                          │
│  │ FINANCE CUSTOMER   │        │ BATCH TRACKER      │                          │
│  │ customers          │        │ school_ar_invoice_  │                          │
│  │ SBS-{branch_code}  │        │ batches             │                          │
│  └────────────────────┘        └────────────────────┘                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   DB TRIGGERS (AUTOMATED)                                       │
│                                                                                 │
│  school_payment_transactions INSERT triggers:                                   │
│  1. update_balance_after_payment    → Updates student balance/status             │
│  2. update_student_balance_on_payment_trigger → FIFO invoice settlement         │
│     └─> Calls apply_payment_to_invoices() → Settles oldest invoices first       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   PAYMENT → FINANCE AR SYNC (CLIENT-SIDE)                       │
│                                                                                 │
│  After payment recorded + DB triggers fire:                                     │
│  RecordPaymentModal.tsx:                                                        │
│  1. Finds school_ar_invoices that are now 'paid'/'partial'                      │
│  2. If ar_invoice_id exists → Updates ar_invoices paid_amount/status            │
│  3. If ar_invoice_id is NULL → Calls syncPaymentToFinanceAR() to create         │
│     a new ar_invoices record and link it back                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## What Is Working (Confirmed)

| Feature | Status | Details |
|---|---|---|
| Bulk AR Invoice Generation | WORKING | Per-student invoices with JE + COA updates |
| Per-Student Finance AR Link | WORKING | school_ar_invoices linked to ar_invoices |
| Payment Recording | WORKING | school_payment_transactions with full metadata |
| FIFO Settlement (DB trigger) | WORKING | apply_payment_to_invoices() settles oldest first |
| Payment GL Posting | WORKING | DR Bank / CR Trade Recv + advance liability handling |
| Overpayment → Advance Liability | WORKING | CR Advance Payments Liability for overpay |
| Credit Consumption | WORKING | DR Advance Liability when credit applied |
| Student Balance Auto-Update | WORKING | DB trigger updates payment_balance, status |
| Finance AR Auto-Sync on Payment | WORKING | RecordPaymentModal syncs ar_invoices status |
| Orphan Invoice Backfill | WORKING | useBackfillARInvoiceLinks utility |
| Expense GL Posting | WORKING | Route expenses DR Expense / CR Cash with type mapping |
| Branch-specific GL Mappings | WORKING | school_bus_expense_gl_mappings per branch/type |
| Fuel Expense Integration | WORKING | useFuelExpenseFinance.ts with AP/bank logic |
| Branch P&L Reports | WORKING | Income vs expenses per-bus with Excel/PDF export |
| Receipt Upload (Public) | WORKING | Public portal + admin verification flow |

---

## Issues Found (Potential Gaps)

### 1. DUPLICATE DB TRIGGERS — Risk: Double student balance update
**Two** AFTER INSERT triggers on `school_payment_transactions`:
- `update_balance_after_payment` → updates student directly
- `update_student_balance_on_payment_trigger` → updates student AND calls FIFO

Both update `school_students.payment_balance` and `current_amount_due`. The second trigger overwrites the first's student update, and both run. This can cause incorrect balance calculations when they race.

**Fix**: Disable the older `update_balance_after_payment` trigger. Keep only `update_student_balance_on_payment_trigger` which does everything (student update + FIFO).

### 2. NO AR RECEIPT CREATION on Payment
When a payment is recorded, the system creates:
- GL Journal Entry (DR Bank / CR Trade Recv)
- Updates ar_invoices paid_amount/status

But it does **NOT** create an `ar_receipts` record in Finance. The `school_payment_transactions` table has an `ar_receipt_id` column (FK to ar_receipts) but it's never populated. This means:
- AR Receipts view in Finance module shows no SBO receipts
- AR reconciliation against bank statements has a gap

**Fix**: After GL posting, create an `ar_receipts` record and link it to the payment transaction.

### 3. STAFF COSTS NOT GL-POSTED
Route staff costs (`route_staff_costs`) are tracked operationally and appear in branch P&L reports, but there's no GL posting for salary expenses. Only `route_expenses` has GL integration.

**Fix**: Add GL posting for staff costs using the salary expense account from settings.

### 4. BANK STATEMENT IMPORT → GL GAP
The `SchoolPaymentImport` flow matches bank statement rows to students and creates `school_payment_transactions`, but does NOT trigger GL posting (no call to `usePostPaymentToGL`). Only `RecordPaymentModal` calls GL posting.

**Fix**: After bank statement match confirmation, trigger GL posting for each matched payment.

---

## Recommended Plan

### Step 1: Fix Duplicate Trigger
Drop `update_balance_after_payment` trigger — keep only the one with FIFO.

### Step 2: Add AR Receipt Creation on Payment
In `RecordPaymentModal` and bank import flows, after GL posting, create `ar_receipts` record and link via `ar_receipt_id`.

### Step 3: Staff Cost GL Posting
Add GL posting logic for `route_staff_costs` using `salary_expense_account_id` from settings.

### Step 4: Bank Import GL Integration
In `PaymentMatchingPreview.tsx` confirmation flow, call `usePostPaymentToGL` for each confirmed payment.

### Files to Edit
- `src/components/school/RecordPaymentModal.tsx` — Add AR receipt creation
- `src/components/school/PaymentMatchingPreview.tsx` — Add GL posting on confirm
- `src/hooks/useSchoolBusFinance.ts` — Add AR receipt helper
- `src/hooks/useSchoolBusExpense.ts` — Add staff cost GL posting
- Supabase migration: Drop duplicate trigger

