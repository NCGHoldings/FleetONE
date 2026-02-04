
# Comprehensive Expense Management & AP Workflow System

## Executive Summary
Build a unified expense management system that allows Operations teams to log expenses (which auto-link to AP), with Finance completing vendor details and processing payments. This covers all business units: School Bus (SBO), Special Hire (SPH), Yutong (YUT), Sinotruck (SNT), Light Vehicle (LTV), and NCG Express (NCGE).

---

## System Architecture Overview

```text
+-------------------+     +-----------------+     +------------------+
|   OPERATIONS      |     |    FINANCE      |     |       AP         |
|   TEAM            | --> |    TEAM         | --> |    PAYMENTS      |
+-------------------+     +-----------------+     +------------------+
|                   |     |                 |     |                  |
| - Create Expense  |     | - Review        |     | - Record Payment |
| - Select Bus      |     | - Add Vendor    |     | - Allocate to    |
| - Select Category |     | - Upload Docs   |     |   Invoice        |
| - Add Basic Info  |     | - Create AP Inv |     | - GL Posting     |
| - Attach Receipt  |     | - Approve       |     |                  |
+-------------------+     +-----------------+     +------------------+
```

---

## Phase 1: Database Schema

### New Table: `expense_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `request_number` | text | Auto-generated (EXP-YYYYMMDD-XXX) |
| `request_date` | date | Date of expense |
| `business_unit_code` | text | SBO, SPH, YUT, SNT, LTV, NCGE |
| `company_id` | uuid | FK to companies (NCG Holding for sub-units) |
| `expense_category` | text | Fuel, Repairs, Salary, etc. (21 categories) |
| `expense_subcategory` | text | Optional sub-categorization |
| `description` | text | Expense description |
| `amount` | numeric | Total expense amount |
| `bus_id` | uuid | Optional FK to buses |
| `vendor_id` | uuid | Optional FK to vendors (Finance fills) |
| `vendor_name_draft` | text | Vendor name if unknown (Operations fills) |
| `payment_method` | text | Cash, Bank, Petty Cash, IOU |
| `petty_cash_id` | uuid | FK to petty_cash if applicable |
| `iou_id` | uuid | FK to iou_records if applicable |
| `receipt_attachment_url` | text | Uploaded receipt/bill |
| `additional_docs` | jsonb | Array of additional document URLs |
| `notes` | text | Additional notes |
| `status` | text | draft, pending_finance, pending_approval, approved, rejected, paid |
| `created_by` | uuid | Operations user who created |
| `reviewed_by` | uuid | Finance user who reviewed |
| `approved_by` | uuid | Approver |
| `ap_invoice_id` | uuid | FK to ap_invoices when linked |
| `ap_payment_id` | uuid | FK to ap_payments when paid |
| `gl_posted` | boolean | GL posting status |
| `journal_entry_id` | uuid | FK to journal_entries |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### New Table: `petty_cash_funds`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `fund_name` | text | "Main Office Petty Cash", etc. |
| `business_unit_code` | text | Which business unit |
| `company_id` | uuid | FK to companies |
| `custodian_id` | uuid | FK to staff_registry |
| `opening_balance` | numeric | Initial fund amount |
| `current_balance` | numeric | Current available balance |
| `gl_account_id` | uuid | FK to chart_of_accounts |
| `is_active` | boolean | |
| `last_replenished_at` | timestamp | |

### New Table: `petty_cash_transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `petty_cash_fund_id` | uuid | FK to petty_cash_funds |
| `transaction_type` | text | disbursement, replenishment |
| `expense_request_id` | uuid | FK to expense_requests |
| `amount` | numeric | |
| `balance_after` | numeric | |
| `receipt_number` | text | |
| `created_by` | uuid | |
| `created_at` | timestamp | |

### New Table: `iou_records`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `iou_number` | text | Auto-generated |
| `business_unit_code` | text | |
| `company_id` | uuid | |
| `staff_id` | uuid | FK to staff_registry |
| `amount` | numeric | Advance given |
| `purpose` | text | |
| `issued_date` | date | |
| `due_date` | date | Expected settlement |
| `settled_amount` | numeric | Amount accounted for |
| `balance` | numeric | Remaining to settle |
| `status` | text | pending, partially_settled, settled, overdue |
| `expense_request_ids` | uuid[] | Linked expense requests |

---

## Phase 2: Expense Categories (21 Categories)

```text
OPERATIONAL:
1. Fuel/Diesel
2. Highway Charges
3. Parking
4. Vehicle Hire

STAFF:
5. Salary/Wages
6. Food/Meals
7. Runner Charges
8. Staff Accommodation

MAINTENANCE:
9. Repairs
10. Tyre/Tube
11. Body Wash/Cleaning

ADMINISTRATIVE:
12. Police/Fines
13. Emission/Fitness
14. Permits Renewal
15. Temporary Permits
16. Log Sheet
17. NTC Charges
18. Legal/Court

OTHER:
19. Accident Compensation
20. Short/Misc
21. Other
```

---

## Phase 3: UI Components

### 3.1 Expense Request Form (Operations)

```text
+----------------------------------------------------------+
| NEW EXPENSE REQUEST                                       |
+----------------------------------------------------------+
| Request #: EXP-20260204-001      Date: [2026-02-04]      |
|                                                           |
| Business Unit: [Dropdown: SBO/SPH/YUT/SNT/LTV/NCGE]      |
|                                                           |
| Expense Category: [Dropdown: 21 categories]              |
|                                                           |
| Bus Number: [Searchable - Optional]                      |
|                                                           |
| Description: [________________________________]          |
|                                                           |
| Amount: [LKR _______________]                            |
|                                                           |
| Payment Method:                                          |
| ( ) Cash - Paid directly                                 |
| ( ) Petty Cash - Select Fund: [___________]             |
| ( ) IOU - Select IOU: [___________]                     |
| ( ) To be paid (Create AP Invoice)                      |
|                                                           |
| Vendor (if known): [_______________] or                  |
| Vendor Name (draft): [_______________]                   |
|                                                           |
| Receipt/Bill: [Upload] [Camera]                          |
|                                                           |
| Notes: [________________________________]               |
|                                                           |
| [ ] I don't know vendor details - Pass to Finance       |
|                                                           |
|          [Cancel]  [Save Draft]  [Submit to Finance]    |
+----------------------------------------------------------+
```

### 3.2 Finance Review Dashboard

```text
+----------------------------------------------------------+
| EXPENSE REQUESTS - FINANCE REVIEW                        |
+----------------------------------------------------------+
| Filter: [All Units v] [Pending v] [Date Range]           |
+----------------------------------------------------------+
| # | Date | Unit | Category | Amount | Vendor | Status    |
|---|------|------|----------|--------|--------|-----------|
| 1 | 02/04| SBO  | Fuel     | 45,000 | -      | Pending   |
| 2 | 02/04| SPH  | Repairs  | 12,500 | Draft  | Review    |
| 3 | 02/03| YUT  | Permits  | 8,000  | Linked | Approved  |
+----------------------------------------------------------+

Action buttons: [View] [Assign Vendor] [Create AP Invoice] [Approve & Post]
```

### 3.3 Enhanced AP Payment Form

When vendor is selected, automatically show unpaid invoices:

```text
+----------------------------------------------------------+
| RECORD AP PAYMENT                                         |
+----------------------------------------------------------+
| Vendor: [abisheka fernado v]  <-- After selection:       |
|                                                           |
| UNPAID INVOICES FOR THIS VENDOR:                         |
| +------------------------------------------------------+ |
| | [x] INV-001 | Due: Feb 10 | Balance: LKR 45,000     | |
| | [ ] INV-002 | Due: Feb 15 | Balance: LKR 12,500     | |
| | [x] INV-003 | Due: Feb 20 | Balance: LKR 8,000      | |
| +------------------------------------------------------+ |
| Selected Total: LKR 53,000                               |
|                                                           |
| Payment Method: [Bank Transfer v]                        |
| Bank Account: [Commercial Bank - Operations v]           |
| Reference: [_______________]                             |
|                                                           |
| [Mark All Full Payment]              [Process Payment]   |
+----------------------------------------------------------+
```

---

## Phase 4: Workflow States

```text
EXPENSE REQUEST WORKFLOW:

     [Draft]
        |
        v
  [Pending Finance] --> Operations submits, needs vendor/docs
        |
        v
  [Pending Approval] --> Finance completes, awaits approval
        |
        v
    [Approved] --> Creates AP Invoice (if needed)
        |
        v
      [Paid] --> AP Payment recorded, GL posted
```

---

## Phase 5: GL Integration

### Expense GL Mapping by Category

Each business unit will have configurable GL mappings:

| Category | Debit Account | Credit Account |
|----------|---------------|----------------|
| Fuel | Fuel Expense (6xxx) | Bank/Petty Cash |
| Repairs | Vehicle Repairs (6xxx) | Bank/AP Payable |
| Salary | Salaries Expense (6xxx) | Bank/Cash |
| Permits | Licenses & Permits (6xxx) | Bank/AP Payable |

### Auto GL Posting Flow

```text
1. Expense Approved + Paid via Petty Cash:
   DR: Expense Category Account
   CR: Petty Cash Account

2. Expense Approved + AP Invoice Created:
   DR: Expense Category Account  
   CR: Accounts Payable

3. AP Payment Recorded:
   DR: Accounts Payable
   CR: Bank Account
```

---

## Phase 6: Company-wise Expense View (Finance Module)

New tab under Finance/Accounting:

```text
+----------------------------------------------------------+
| COMPANY EXPENSES                                          |
+----------------------------------------------------------+
| [NCG Holding] [School Bus] [Special Hire] [All Units]    |
+----------------------------------------------------------+
| Date Range: [Feb 1] to [Feb 28]                          |
+----------------------------------------------------------+
|                                                           |
| EXPENSE SUMMARY BY CATEGORY:                             |
| +------------------------------------------------------+ |
| | Category       | SBO      | SPH     | YUT    | Total | |
| |----------------|----------|---------|--------|-------| |
| | Fuel           | 450,000  | 120,000 | 85,000 | 655K  | |
| | Repairs        | 125,000  | 45,000  | 32,000 | 202K  | |
| | Salary         | 890,000  | 320,000 | 150,000| 1.36M | |
| | ...            | ...      | ...     | ...    | ...   | |
| +------------------------------------------------------+ |
|                                                           |
| [Export to Excel] [View Details] [Print Report]          |
+----------------------------------------------------------+
```

---

## Phase 7: Document Management

### Attachment Support

- Receipt images (JPG, PNG)
- PDF invoices/bills
- Multiple attachments per expense
- Document preview modal
- OCR integration (future)

### Storage Structure

```text
uploads/
  expenses/
    {company_id}/
      {year}/{month}/
        {expense_request_id}/
          receipt.jpg
          invoice.pdf
          additional_001.pdf
```

---

## Phase 8: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/accounting/ExpenseRequestForm.tsx` | Operations expense entry form |
| `src/components/accounting/ExpenseReviewView.tsx` | Finance review dashboard |
| `src/components/accounting/CompanyExpensesView.tsx` | Company-wise expense tracking |
| `src/components/accounting/PettyCashView.tsx` | Petty cash management |
| `src/components/accounting/IOUManagementView.tsx` | IOU tracking |
| `src/hooks/useExpenseRequests.ts` | Data hooks for expense requests |
| `src/hooks/usePettyCash.ts` | Petty cash hooks |
| `supabase/migrations/xxx_expense_management_system.sql` | Database migration |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/accounting/APPaymentForm.tsx` | Auto-show invoices after vendor selection |
| `src/components/accounting/APInvoiceForm.tsx` | Add expense request linking |
| `src/pages/Accounting.tsx` | Add Expenses module tab |
| `src/integrations/supabase/types.ts` | Add new table types |

---

## Phase 9: Petty Cash & IOU Integration

### Petty Cash Flow

```text
1. Fund Setup:
   - Create petty cash fund per business unit
   - Set custodian and opening balance
   - Link to GL account (1xxx - Current Asset)

2. Disbursement:
   - Expense request selects petty cash
   - Amount deducted from fund balance
   - GL: DR Expense / CR Petty Cash

3. Replenishment:
   - When fund runs low, replenish from bank
   - GL: DR Petty Cash / CR Bank
```

### IOU Flow

```text
1. Issue IOU:
   - Staff receives advance for expected expenses
   - GL: DR Staff Advances (1xxx) / CR Bank

2. Settle IOU:
   - Expense requests linked to IOU
   - Each expense reduces IOU balance
   - Return excess cash if any

3. Overdue IOUs:
   - Alert for unsettled IOUs past due date
   - Escalation to management
```

---

## Implementation Priority

| Priority | Component | Effort |
|----------|-----------|--------|
| 1 | Database schema for expense_requests | 2 hours |
| 2 | ExpenseRequestForm.tsx (Operations) | 4 hours |
| 3 | Enhanced APPaymentForm.tsx | 2 hours |
| 4 | ExpenseReviewView.tsx (Finance) | 3 hours |
| 5 | CompanyExpensesView.tsx | 3 hours |
| 6 | Petty Cash tables and UI | 4 hours |
| 7 | IOU Management | 3 hours |
| 8 | GL Integration | 3 hours |
| 9 | Document upload/preview | 2 hours |
| 10 | Reports and export | 2 hours |

**Total Estimated: 28 hours**

---

## Benefits

1. **Operations Efficiency**: Staff can log expenses without knowing all vendor details
2. **Finance Control**: All expenses go through finance review before payment
3. **Audit Trail**: Complete tracking from expense request to GL posting
4. **Company-wise Reporting**: Track expenses by business unit
5. **Cash Management**: Petty cash and IOU properly tracked
6. **Document Management**: All bills/receipts attached and accessible
7. **Integration**: Seamless flow to existing AP and GL systems
