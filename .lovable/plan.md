
# School Bus & Yutong Finance Integration - Complete Flow Diagrams

## Document Purpose
This document provides detailed operation-to-finance flow diagrams for verification by the Finance Team. It covers the complete lifecycle of transactions from operational events to General Ledger postings.

---

## SCHOOL BUS MODULE - Complete Finance Flow

### Overview Architecture
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SCHOOL BUS FINANCE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Business Unit Code: SBO                                                         │
│  Parent Company: NCG Holding (Consolidated GL)                                   │
│  Finance Settings: school_bus_finance_settings                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

REQUIRED GL ACCOUNTS:
┌────────────────────────────┬────────────────────┬───────────────────────────────┐
│ Account Type               │ Purpose            │ Account Category              │
├────────────────────────────┼────────────────────┼───────────────────────────────┤
│ Trade Receivable Account   │ Student AR balance │ Asset                         │
│ SBS Collection Account     │ Fee Revenue        │ Revenue                       │
│ Bank/Cash Account          │ Payment receipt    │ Asset                         │
│ Fuel Expense Account       │ Fuel costs         │ Expense                       │
│ Maintenance Expense Account│ Repairs            │ Expense                       │
│ Salary Expense Account     │ Driver wages       │ Expense                       │
│ Expense Cash Account       │ Cash for expenses  │ Asset                         │
└────────────────────────────┴────────────────────┴───────────────────────────────┘
```

---

### FLOW 1: AR Invoice Generation (Revenue Recognition)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: GENERATE AR INVOICE BATCH                           │
│                      Trigger: User clicks "Generate AR Invoices"                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  FOR EACH STUDENT (Processed in parallel chunks of 50):                         │
│                                                                                  │
│  1. Create school_ar_invoice_batches                                            │
│     └─ batch_number: SBS-BATCH-YYYYMMDD-NNNN                                    │
│     └─ status: "pending" → "posted"                                             │
│                                                                                  │
│  2. Get/Create Finance Customer                                                 │
│     └─ customers table                                                          │
│     └─ customer_code: SBS-{BRANCH_CODE}                                         │
│     └─ business_unit_code: SBO                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. CREATE JOURNAL ENTRY (Per Student)                                          │
│     └─ entry_number: SBS-JE-YYYYMMDD-{STUDENT_SHORT_ID}                         │
│     └─ business_unit_code: SBO                                                  │
│     └─ company_id: NCG Holding (Consolidated GL)                                │
│     └─ status: "posted"                                                         │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Trade Receivable (Asset)               │ AMOUNT    │           │            │
│  │ SBS Collection Revenue (Revenue)       │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  4. UPDATE COA BALANCES                                                         │
│     └─ Trade Receivable: +AMOUNT (Debit normal)                                 │
│     └─ SBS Collection: +AMOUNT (Credit normal)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  5. CREATE FINANCE AR INVOICE (ar_invoices table)                               │
│     └─ invoice_number: SBS-INV-YYYYMM-NNNNN                                     │
│     └─ customer_id: {Finance Customer ID}                                       │
│     └─ business_unit_code: SBO                                                  │
│     └─ total_amount: student.current_amount_due                                 │
│     └─ balance: student.current_amount_due                                      │
│     └─ paid_amount: 0                                                           │
│     └─ status: "unpaid"                                                         │
│     └─ journal_entry_id: {Created JE ID}                                        │
│                                                                                  │
│  6. CREATE SCHOOL AR INVOICE (school_ar_invoices table)                         │
│     └─ batch_id: {Batch ID}                                                     │
│     └─ student_id: {Student ID}                                                 │
│     └─ ar_invoice_id: {Finance AR Invoice ID}  ← CRITICAL LINK                  │
│     └─ journal_entry_id: {JE ID}                                                │
│     └─ status: "posted"                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### FLOW 2: Payment Recording (Cash Receipt)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: RECORD PAYMENT                                      │
│                      Trigger: User records student payment                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. CREATE PAYMENT TRANSACTION (school_payment_transactions)                     │
│     └─ student_id: {Student ID}                                                 │
│     └─ payment_month: selected month                                            │
│     └─ amount_paid: received amount                                             │
│     └─ payment_method: Cash/Bank/Online/Cheque                                  │
│     └─ payment_balance_before: previous balance                                 │
│     └─ payment_balance_after: new balance                                       │
│                                                                                  │
│  DATABASE TRIGGER FIRES: update_student_balance_on_payment_trigger              │
│     └─ Updates student.current_amount_due (decreases)                           │
│     └─ Updates student.payment_balance                                          │
│     └─ FIFO Settlement: Applies payment to oldest invoices first                │
│        └─ Updates school_ar_invoices.paid_amount                                │
│        └─ Updates school_ar_invoices.status (unpaid → partial → paid)           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  2. POST PAYMENT TO GL (If auto_post_payments = true)                           │
│     └─ entry_number: SBS-PAY-YYYYMMDD-XXXX                                      │
│     └─ business_unit_code: SBO                                                  │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Bank/Cash Account (Asset)              │ AMOUNT    │           │            │
│  │ Trade Receivable (Asset)               │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  COA BALANCE UPDATES:                                                           │
│     └─ Bank/Cash: +AMOUNT (Debit normal)                                        │
│     └─ Trade Receivable: -AMOUNT (Debit normal, credit reduces)                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. SYNC TO FINANCE AR MODULE                                                   │
│                                                                                  │
│  IF school_ar_invoices.ar_invoice_id EXISTS:                                    │
│     └─ Update ar_invoices.paid_amount                                           │
│     └─ Update ar_invoices.balance                                               │
│     └─ Update ar_invoices.status (unpaid → partial → paid)                      │
│                                                                                  │
│  IF school_ar_invoices.ar_invoice_id IS NULL (Legacy Data):                     │
│     └─ Create new ar_invoices record                                            │
│     └─ Link back: school_ar_invoices.ar_invoice_id = new ID                     │
│     └─ syncPaymentToFinanceAR() handles this automatically                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### FLOW 3: Expense Recording

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: ADD ROUTE EXPENSE                                   │
│                      Trigger: User adds expense to route                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. CREATE EXPENSE RECORD (route_expenses)                                       │
│     └─ route_id: {Route ID}                                                     │
│     └─ bus_id: {Optional Bus ID}                                                │
│     └─ expense_category: Fuel/Maintenance/Salary/General                        │
│     └─ amount: expense amount                                                   │
│     └─ expense_date: date                                                       │
│     └─ notes: description                                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  2. POST EXPENSE TO GL (If auto_post_expenses = true)                           │
│     └─ entry_number: SBS-EXP-YYYYMMDD-XXXX                                      │
│     └─ business_unit_code: SBO                                                  │
│                                                                                  │
│  ACCOUNT SELECTION BY CATEGORY:                                                 │
│  ┌────────────────────┬────────────────────────────────────────┐               │
│  │ Category           │ GL Account Used                        │               │
│  ├────────────────────┼────────────────────────────────────────┤               │
│  │ Fuel               │ fuel_expense_account_id                │               │
│  │ Maintenance        │ maintenance_expense_account_id         │               │
│  │ Salary             │ salary_expense_account_id              │               │
│  │ General            │ expense_account_id (default)           │               │
│  └────────────────────┴────────────────────────────────────────┘               │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Expense Account (Expense)              │ AMOUNT    │           │            │
│  │ Expense Cash Account (Asset)           │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  COA BALANCE UPDATES:                                                           │
│     └─ Expense Account: +AMOUNT (Debit normal)                                  │
│     └─ Cash Account: -AMOUNT (Debit normal, credit reduces)                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### School Bus - Complete Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SCHOOL BUS DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

OPERATIONS LAYER                        FINANCE LAYER                    ACCOUNTING LAYER
─────────────────                       ─────────────                    ────────────────

┌──────────────────┐                   ┌──────────────────┐            ┌──────────────────┐
│ school_students  │                   │    customers     │            │ chart_of_accounts│
│                  │                   │                  │            │                  │
│ • student_name   │                   │ • customer_code  │            │ • account_code   │
│ • current_due    │                   │ • business_unit  │            │ • current_balance│
│ • payment_balance│                   │   _code: SBO     │            │ • account_type   │
└────────┬─────────┘                   └────────┬─────────┘            └────────┬─────────┘
         │                                      │                               │
         ▼                                      ▼                               │
┌──────────────────┐     ar_invoice_id  ┌──────────────────┐                   │
│school_ar_invoices│────────────────────│   ar_invoices    │                   │
│                  │                    │                  │                    │
│ • invoice_number │                    │ • invoice_number │                    │
│ • amount         │                    │ • total_amount   │                    │
│ • paid_amount    │──── SYNCED ────────│ • paid_amount    │                    │
│ • status         │                    │ • balance        │                    │
│ • ar_invoice_id ─┼───────────────────→│ • status         │                    │
│ • journal_entry  │                    │ • business_unit  │                    │
│   _id            │                    │   _code: SBO     │                    │
└────────┬─────────┘                    └──────────────────┘                    │
         │                                                                       │
         ▼                                                                       │
┌──────────────────┐     journal_entry_id  ┌──────────────────┐                │
│school_payment_   │───────────────────────│ journal_entries  │────────────────┤
│transactions      │                       │                  │                │
│                  │                       │ • entry_number   │                │
│ • amount_paid    │                       │ • total_debit    │                │
│ • payment_method │                       │ • total_credit   │                │
│ • gl_posted      │                       │ • business_unit  │                │
│ • journal_entry  │                       │   _code: SBO     │                │
│   _id            │                       │ • company_id:    │                │
└──────────────────┘                       │   NCG_HOLDING    │                │
                                           └────────┬─────────┘                │
                                                    │                          │
                                                    ▼                          │
                                           ┌──────────────────┐                │
                                           │journal_entry_    │ Updates        │
                                           │lines             │────────────────┘
                                           │                  │
                                           │ • account_id     │
                                           │ • debit          │
                                           │ • credit         │
                                           └──────────────────┘
```

---

## YUTONG MODULE - Complete Finance Flow

### Overview Architecture
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        YUTONG SALES FINANCE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Business Unit Code: YUT                                                         │
│  Parent Company: NCG Holding (Consolidated GL)                                   │
│  Finance Settings: yutong_finance_settings                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

REQUIRED GL ACCOUNTS (* = Mandatory for operation):
┌────────────────────────────┬────────────────────┬───────────────────────────────┐
│ Account Type               │ Purpose            │ Account Category              │
├────────────────────────────┼────────────────────┼───────────────────────────────┤
│ *Bank Account              │ Payment receipt    │ Asset                         │
│ *Customer Advance Account  │ Advance Liability  │ Liability                     │
│ *Sales Revenue Account     │ Vehicle Sales      │ Revenue                       │
│ *Trade Receivable Account  │ Invoice balance    │ Asset                         │
│ Spare Parts Revenue        │ Parts Sales        │ Revenue (Optional)            │
│ Discount Expense           │ Discounts given    │ Expense (Optional)            │
│ Commission Expense         │ Sales commission   │ Expense (Optional)            │
│ VAT Output                 │ VAT collected      │ Liability (Optional)          │
│ WHT Payable                │ Withholding tax    │ Liability (Optional)          │
└────────────────────────────┴────────────────────┴───────────────────────────────┘
```

---

### FLOW 1: Customer Payment Verification (Cash Receipt = GL ONLY)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: RECORD CUSTOMER PAYMENT                             │
│                      Trigger: Customer pays advance/deposit                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. CREATE PAYMENT RECORD (yutong_customer_payments)                             │
│     └─ order_id: {Order ID}                                                     │
│     └─ payment_amount: amount received                                          │
│     └─ payment_method: bank_transfer/cash/cheque/LC                             │
│     └─ payment_reference: bank slip/cheque no                                   │
│     └─ status: "pending"                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 2: VERIFY PAYMENT (Finance Approval)                   │
│                      Trigger: Finance team clicks "Verify Payment"               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. CREATE/GET FINANCE CUSTOMER (If auto_create_customer = true)                 │
│     └─ customers table                                                          │
│     └─ customer_code: YUT-{TIMESTAMP}-{RANDOM}                                  │
│     └─ business_unit_code: YUT                                                  │
│     └─ Link to order: yutong_orders.finance_customer_id                         │
│                                                                                  │
│  2. POST TO GL (If auto_post_on_verify = true)                                  │
│     └─ entry_number: YUT-ADV-{ORDER_NO}                                         │
│     └─ reference: YUT ADV - {ORDER_NO} - {CUSTOMER_NAME}                        │
│     └─ business_unit_code: YUT                                                  │
│                                                                                  │
│  CRITICAL: Payment = Advance Receipt (Liability), NOT Revenue                   │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Bank Account (Asset)                   │ AMOUNT    │           │            │
│  │ Customer Advance (Liability)           │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  COA BALANCE UPDATES:                                                           │
│     └─ Bank Account: +AMOUNT (Debit normal)                                     │
│     └─ Customer Advance: +AMOUNT (Credit normal - liability increases)          │
│                                                                                  │
│  3. UPDATE PAYMENT STATUS                                                       │
│     └─ status: "verified"                                                       │
│     └─ verified_by: {User ID}                                                   │
│     └─ verified_at: timestamp                                                   │
│     └─ journal_entry_id: {JE ID}                                                │
│     └─ ar_receipt_id: NULL ← NOT created yet (no invoice exists)                │
│                                                                                  │
│  ⚠️ AR INVOICE IS NOT CREATED HERE - Created when System Invoice approved       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### FLOW 2: System Invoice Approval (Revenue Recognition)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: GENERATE DRAFT INVOICE                              │
│                      Trigger: User generates invoice from order                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. CREATE INVOICE RECORD (yutong_invoice_records)                               │
│     └─ invoice_no: YUT-INV-YYYYMM-XXXX                                          │
│     └─ order_id: {Order ID}                                                     │
│     └─ invoice_amount: total vehicle price                                      │
│     └─ status: "draft"                                                          │
│                                                                                  │
│  2. CREATE INVOICE DOCUMENT (yutong_invoice_documents)                           │
│     └─ PDF generated with watermark "DRAFT"                                     │
│     └─ Stored in yutong-invoices bucket                                         │
│     └─ document_status: "draft"                                                 │
│                                                                                  │
│  ⚠️ NO GL ENTRY - Draft invoices don't affect accounting                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STEP 2: APPROVE INVOICE (Finance Approval)                  │
│                      Trigger: Authorized user clicks "Approve Invoice"           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. UPDATE INVOICE STATUS                                                       │
│     └─ yutong_invoice_records.status: "approved"                                │
│     └─ approved_by: {User ID}                                                   │
│     └─ approved_at: timestamp                                                   │
│                                                                                  │
│  2. REGENERATE PDF (Without "DRAFT" watermark)                                   │
│     └─ yutong_invoice_documents.document_status: "approved"                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. CREATE FINANCE AR INVOICE (ar_invoices table)                               │
│     └─ invoice_number: YUT-INV-YYMM-{TIMESTAMP}                                 │
│     └─ customer_id: {Finance Customer ID from order}                            │
│     └─ business_unit_code: YUT                                                  │
│     └─ total_amount: invoice amount                                             │
│     └─ paid_amount: total verified payments (advances)                          │
│     └─ balance: total_amount - paid_amount                                      │
│     └─ status: based on balance (paid/partial/unpaid)                           │
│                                                                                  │
│  4. LINK AR INVOICE TO ORDER                                                    │
│     └─ yutong_orders.ar_invoice_id = {New AR Invoice ID}                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  5. POST REVENUE RECOGNITION GL ENTRY                                           │
│     └─ entry_number: YUT-INV-{ORDER_NO}                                         │
│     └─ reference: YUT INVOICE - {ORDER_NO} - {CUSTOMER_NAME}                    │
│     └─ business_unit_code: YUT                                                  │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Trade Receivable (Asset)               │ AMOUNT    │           │            │
│  │ Sales Revenue (Revenue)                │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  COA BALANCE UPDATES:                                                           │
│     └─ Trade Receivable: +AMOUNT (Debit normal)                                 │
│     └─ Sales Revenue: +AMOUNT (Credit normal)                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  6. APPLY ADVANCES AGAINST RECEIVABLE (If advances exist)                       │
│     └─ entry_number: YUT-ADV-APPLY-{ORDER_NO}                                   │
│     └─ Reduces both liability and receivable                                    │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Customer Advance (Liability)           │ AMOUNT    │           │            │
│  │ Trade Receivable (Asset)               │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  COA BALANCE UPDATES:                                                           │
│     └─ Customer Advance: -AMOUNT (Credit normal, debit reduces)                 │
│     └─ Trade Receivable: -AMOUNT (Debit normal, credit reduces)                 │
│                                                                                  │
│  NET EFFECT: Advance liability cleared, receivable reduced by advance amount    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### FLOW 3: Balance Payment (After Invoice)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      BALANCE PAYMENT (After Invoice Exists)                      │
│                      Trigger: Customer pays remaining balance                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. RECORD & VERIFY PAYMENT                                                     │
│     └─ Same process as advance payment                                          │
│     └─ Payment type detected as "balance" (if AR invoice exists)                │
│                                                                                  │
│  2. POST BALANCE GL ENTRY                                                       │
│     └─ entry_number: YUT-BAL-{ORDER_NO}                                         │
│                                                                                  │
│  JOURNAL ENTRY LINES:                                                           │
│  ┌────────────────────────────────────────┬───────────┬───────────┐            │
│  │ Account                                │ Debit     │ Credit    │            │
│  ├────────────────────────────────────────┼───────────┼───────────┤            │
│  │ Bank Account (Asset)                   │ AMOUNT    │           │            │
│  │ Trade Receivable (Asset)               │           │ AMOUNT    │            │
│  └────────────────────────────────────────┴───────────┴───────────┘            │
│                                                                                  │
│  3. UPDATE AR INVOICE                                                           │
│     └─ ar_invoices.paid_amount: increased                                       │
│     └─ ar_invoices.balance: decreased                                           │
│     └─ ar_invoices.status: "partial" or "paid"                                  │
│                                                                                  │
│  4. CREATE AR RECEIPT (ar_receipts table)                                       │
│     └─ Links payment to AR Invoice                                              │
│     └─ receipt_number: YUT-RCT-YYMM-{TIMESTAMP}                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Yutong - Complete Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           YUTONG SALES DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

OPERATIONS LAYER                        FINANCE LAYER                    ACCOUNTING LAYER
─────────────────                       ─────────────                    ────────────────

┌──────────────────┐                   ┌──────────────────┐            ┌──────────────────┐
│yutong_quotations │                   │    customers     │            │ chart_of_accounts│
│                  │                   │                  │            │                  │
│ • quotation_no   │                   │ • customer_code  │            │ • account_code   │
│ • customer_name  │                   │ • business_unit  │            │ • current_balance│
│ • total_amount   │                   │   _code: YUT     │            │ • account_type   │
└────────┬─────────┘                   └────────┬─────────┘            └────────┬─────────┘
         │                                      │                               │
         ▼                                      │                               │
┌──────────────────┐                            │                               │
│  yutong_orders   │←───────────────────────────┤                               │
│                  │  finance_customer_id       │                               │
│ • order_no       │                            │                               │
│ • total_amount   │                            │                               │
│ • total_paid     │                            │                               │
│ • balance_due    │                            │                               │
│ • finance_       │                            │                               │
│   customer_id ───┼────────────────────────────┘                               │
│ • ar_invoice_id ─┼────────────────┐                                           │
└────────┬─────────┘                │                                           │
         │                          │                                           │
         ▼                          ▼                                           │
┌──────────────────┐         ┌──────────────────┐                              │
│yutong_customer_  │         │   ar_invoices    │                              │
│payments          │         │                  │                               │
│                  │         │ • invoice_number │                               │
│ • payment_amount │         │ • total_amount   │                               │
│ • payment_method │         │ • paid_amount    │                               │
│ • status         │         │ • balance        │                               │
│ • journal_entry  │         │ • status         │                               │
│   _id ───────────┼─────┐   │ • business_unit  │                               │
│ • ar_receipt_id ─┼───┐ │   │   _code: YUT     │                               │
└────────┬─────────┘   │ │   └──────────────────┘                               │
         │             │ │                                                       │
         │             │ │                                                       │
         ▼             │ │                                                       │
┌──────────────────┐   │ │   ┌──────────────────┐                               │
│yutong_invoice_   │   │ └──→│ journal_entries  │───────────────────────────────┤
│records           │   │     │                  │                               │
│                  │   │     │ • entry_number   │                               │
│ • invoice_no     │   │     │ • total_debit    │                               │
│ • invoice_amount │   │     │ • total_credit   │                               │
│ • status         │   │     │ • business_unit  │                               │
│ • approved_by    │   │     │   _code: YUT     │                               │
└──────────────────┘   │     │ • company_id:    │                               │
                       │     │   NCG_HOLDING    │                               │
                       │     └────────┬─────────┘                               │
                       │              │                                          │
                       │              ▼                                          │
                       │     ┌──────────────────┐                               │
                       │     │journal_entry_    │ Updates                        │
                       │     │lines             │───────────────────────────────┘
                       │     │                  │
                       │     │ • account_id     │
                       │     │ • debit          │
                       │     │ • credit         │
                       │     └──────────────────┘
                       │
                       │     ┌──────────────────┐
                       └────→│   ar_receipts    │
                             │                  │
                             │ • receipt_number │
                             │ • amount         │
                             │ • business_unit  │
                             │   _code: YUT     │
                             └──────────────────┘
```

---

## COMPARISON: School Bus vs Yutong Accounting Treatment

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ACCOUNTING TREATMENT COMPARISON                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                    SCHOOL BUS (SBO)                    YUTONG (YUT)
                    ────────────────                    ────────────
REVENUE MODEL:      Monthly subscription                One-time vehicle sale
                    (recurring)                         (high-value)

WHEN REVENUE        At invoice generation               At system invoice approval
IS RECOGNIZED:      (same time as AR)                   (separate from payment)

PAYMENT FLOW:       Direct to Receivable                1. Advance → Liability
                    DR Bank | CR Receivable             2. Invoice → Revenue
                                                        3. Apply advance

AR INVOICE          When AR batch is created            When system invoice is approved
CREATED:            (same time as GL)                   (not at payment time)

PAYMENT GL:         DR Bank                             Payment BEFORE invoice:
                    CR Trade Receivable                   DR Bank | CR Customer Advance
                    (direct reduction)                  
                                                        Payment AFTER invoice:
                                                          DR Bank | CR Trade Receivable

KEY DIFFERENCE:     No liability stage                  Advance is a liability until
                    (payment = revenue earned)          invoice is issued

FIFO SETTLEMENT:    Yes (oldest invoice first)          No (explicit allocation)

EXPENSE TRACKING:   Yes (route_expenses)                No (vehicle cost is inventory)
```

---

## GAP ANALYSIS - MISSING POINTS IDENTIFIED

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         GAP ANALYSIS & RECOMMENDATIONS                           │
└─────────────────────────────────────────────────────────────────────────────────┘

✅ IMPLEMENTED & WORKING:
──────────────────────────
│ Item                                              │ School Bus │ Yutong │
├───────────────────────────────────────────────────┼────────────┼────────┤
│ AR Invoice Generation                             │     ✅      │   ✅    │
│ GL Entry for Revenue Recognition                  │     ✅      │   ✅    │
│ Payment GL Posting                                │     ✅      │   ✅    │
│ Business Unit Tagging (SBO/YUT)                   │     ✅      │   ✅    │
│ COA Balance Auto-Update                           │     ✅      │   ✅    │
│ Finance Customer Creation                         │     ✅      │   ✅    │
│ AR Invoice Status Sync (unpaid/partial/paid)      │     ✅      │   ✅    │
│ Backfill for Legacy Data                          │     ✅      │   N/A  │
│ Advance → Liability Accounting                    │     N/A    │   ✅    │
│ Revenue Recognition at Invoice Approval           │     N/A    │   ✅    │
│ Advance Application to Receivable                 │     N/A    │   ✅    │
└───────────────────────────────────────────────────┴────────────┴────────┘

⚠️ CONFIGURATION REQUIRED (Not Code Issues):
──────────────────────────────────────────────
│ Issue                                             │ Action Required                │
├───────────────────────────────────────────────────┼────────────────────────────────┤
│ Yutong: Bank Account not configured               │ Settings → Yutong Finance      │
│ Yutong: Trade Receivable not configured           │ Settings → Yutong Finance      │
│ Yutong: Sales Revenue not configured              │ Settings → Yutong Finance      │
│ School Bus: Expense accounts not configured       │ Settings → School Bus Finance  │
│ School Bus: auto_post_expenses = false            │ Enable after configuring accts │
└───────────────────────────────────────────────────┴────────────────────────────────┘

🔄 POTENTIAL IMPROVEMENTS (Optional):
──────────────────────────────────────
1. Add AR Receipt creation for Yutong balance payments (after invoice)
2. Add reversal entry capability for voided invoices
3. Add period-end closing entries automation
4. Add multi-currency support for international vehicle sales
5. Add tax computation (VAT/WHT) automation in GL entries
```

---

## AUDIT TRAIL SUMMARY

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE AUDIT TRAIL                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

SCHOOL BUS (SBO):
Operation Record → school_ar_invoices → ar_invoices → journal_entries → COA
      ↓                    ↓                              ↓
  school_students    school_payment_        journal_entry_lines
                     transactions

YUTONG (YUT):
Operation Record → yutong_orders → ar_invoices → journal_entries → COA
      ↓                  ↓              ↓              ↓
 yutong_quotations  yutong_customer_  ar_receipts  journal_entry_lines
                    payments

All records are linked via:
• business_unit_code: SBO or YUT
• company_id: NCG Holding (consolidated)
• journal_entry_id: Direct link to GL
• ar_invoice_id: Direct link to Finance AR
```

---

## TESTING RECOMMENDATIONS FOR FINANCE TEAM

### School Bus Testing:
1. Generate AR invoices for a batch of students
2. Verify `ar_invoices` shows correct totals
3. Record a partial payment
4. Verify `ar_invoices.status` updates to "partial"
5. Check GL entries show correct account postings
6. Verify COA balances updated correctly

### Yutong Testing:
1. Record an advance payment (before invoice)
2. Verify GL shows: DR Bank | CR Customer Advance (NOT revenue)
3. Generate and approve a system invoice
4. Verify AR Invoice is created NOW (not before)
5. Verify GL shows: DR Trade Receivable | CR Sales Revenue
6. Verify Advance Application GL: DR Advance | CR Receivable
7. Record balance payment
8. Verify AR Invoice status updates to "paid"
