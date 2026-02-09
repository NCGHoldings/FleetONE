

# NCG FleetFlow ERP - Complete System Testing Guide

## System Architecture Overview

This is a comprehensive enterprise resource planning (ERP) system with deep integration between Operations and Finance modules. Below is the complete testing checklist organized by business unit and module.

---

## ORGANIZATION STRUCTURE

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              NCG HOLDING COMPANY STRUCTURE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│                                    ┌──────────────────┐                                  │
│                                    │   NCG HOLDING    │                                  │
│                                    │  (Parent Entity) │                                  │
│                                    │ Consolidated GL  │                                  │
│                                    └────────┬─────────┘                                  │
│                                             │                                            │
│            ┌──────────────┬─────────────────┼─────────────────┬──────────────┐          │
│            ▼              ▼                 ▼                 ▼              ▼          │
│   ┌────────────┐  ┌────────────┐   ┌────────────┐    ┌────────────┐  ┌────────────┐    │
│   │    SBO     │  │    YUT     │   │    SPH     │    │    SNT     │  │    LTV     │    │
│   │ School Bus │  │  Yutong    │   │  Special   │    │ Sinotruck  │  │   Light    │    │
│   │ Operations │  │   Sales    │   │    Hire    │    │   Sales    │  │  Vehicle   │    │
│   └────────────┘  └────────────┘   └────────────┘    └────────────┘  └────────────┘    │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                          NCG EXPRESS (Standalone Entity)                         │   │
│   │                     Separate GL, Separate Chart of Accounts                      │   │
│   │                              Business Unit: NCGE                                 │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## SECTION 1: OPERATIONS MODULES

### 1.1 NCG Express (Public Transport Operations)
**Page:** `/daily-trips`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Record Daily Trip | Add trip with bus, route, conductor, revenue | Trip record created |
| 2 | Record Trip Expenses | Add fuel, salary, repair expenses for trip | Expenses recorded with bus_id |
| 3 | Auto GL Posting | Enable auto-post in NCG Express Finance Settings | DR Cash/CR Ticket Revenue |
| 4 | Bulk GL Posting | Select multiple unposted records, bulk post to GL | Journal entries created |
| 5 | Bus Profitability Report | View Bus P&L tab | Revenue vs Expenses per bus |
| 6 | Route Profitability Report | View Route P&L tab | Revenue allocated by route trips |

**Data Flow:**
```text
Daily Trip Entry → daily_trips table → Auto GL Posting → journal_entries
                 ↓
Daily Bus Expenses → daily_bus_expenses table → Auto GL Posting → journal_entries
                 ↓
Reports aggregate from journal_entry_lines with bus_id/route_id metadata
```

---

### 1.2 School Bus Operations (SBO)
**Page:** `/school-bus-service`, `/school-students`, `/school-payments`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Branch Management | Create/manage school branches | Branch-wise GL mapping |
| 2 | Student Registration | Add students with routes, fees | Student record created |
| 3 | Bulk AR Invoice Generation | Generate invoices for all students in batch | Individual AR Invoice per student |
| 4 | Payment Recording | Record student payment via modal | FIFO settlement + AR Receipt |
| 5 | Payment Import | Import bank statement with payments | Match payments to students |
| 6 | Route Expense Tracking | Log fuel/salary expenses per route | Expenses linked to branch |
| 7 | Finance Integration Monitor | Check integration status in settings | Verify orphaned invoices backfill |

**Data Flow:**
```text
Student Registration → school_students table
          ↓
Bulk Invoice Generation → ar_invoices (batch of 50)
          ↓                       ↓
Payment Recording → school_student_payments → ar_receipts
          ↓
GL Posting: DR Trade Receivable / CR SBS Collection Revenue
```

---

### 1.3 Special Hire Operations (SPH)
**Page:** `/special-hire`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Create Quotation | Add customer, route, bus type, calculate cost | Quotation created |
| 2 | Confirm Quotation | Mark quotation as confirmed | Order created |
| 3 | Record Advance Payment | Enter advance with photo/receipt | Payment pending finance approval |
| 4 | Finance Approve Advance | Finance approves with signature | AR Invoice created, GL: DR Bank/CR Advance |
| 5 | Complete Trip | Mark trip as completed | Trip status updated |
| 6 | Generate Balance Invoice | Post-trip adjustment, create balance invoice | AR Invoice updated with final amount |
| 7 | Record Balance Payment | Enter final payment | GL: DR Bank/CR Trade Receivable |
| 8 | Referral Commission | Track agent commission, record payment | Commission tracked per quotation |

**Data Flow:**
```text
Quotation → special_hire_quotations
     ↓ (confirm)
Order → special_hire_quotations (status: confirmed)
     ↓ (advance payment)
Advance Payment → special_hire_payments → Finance Approval
     ↓ (finance approve)
Finance Customer Created → customers
AR Invoice Created → ar_invoices (status: unpaid)
GL Entry → DR Bank / CR Customer Advance
     ↓ (trip complete + balance invoice)
AR Invoice Updated → Total revised
GL Entry → DR Trade Receivable / CR Revenue
GL Entry → DR Customer Advance / CR Trade Receivable (apply advance)
     ↓ (balance payment)
AR Receipt → ar_receipts
GL Entry → DR Bank / CR Trade Receivable
AR Invoice → status: paid
```

**Document Flow:**
```text
Quotation → Advance Receipt → Post-Trip Adjustment → Balance Invoice → Final Receipt
   ↓              ↓                    ↓                   ↓              ↓
[PDF]          [PDF]               [PDF]               [PDF]          [PDF]
                                      ↓
                         All documents use template system
                         with business_unit_code = SPH
```

---

### 1.4 Yutong Bus Sales (YUT)
**Page:** `/yutong-sales`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Bus Model Setup | Add Yutong bus models with specs | Models available for quotation |
| 2 | Create Quotation | Select model, add-ons, calculate price | Quotation created |
| 3 | Confirm & Create Order | Convert quotation to order | Order with 8-stage journey |
| 4 | Record Payment | Enter payment (cash/lease) | Payment pending verification |
| 5 | Finance Verify Payment | Finance verifies with signature | GL: DR Bank / CR Customer Advance |
| 6 | Generate System Invoice | Approve and generate invoice | AR Invoice + Revenue GL |
| 7 | Track Order Journey | Update 8-stage progress | Journey milestones tracked |
| 8 | Complete 30-Task Checklist | Operational tasks checklist | Operations tracked |
| 9 | Referral Commission | Track agent referral | Commission recorded |

**8-Stage Order Journey:**
```text
1. Order Confirmation → 2. Payment Collection → 3. Vehicle Preparation →
4. Documentation → 5. Vehicle Inspection → 6. RMV Registration →
7. Final Check → 8. Delivery
```

**Data Flow:**
```text
Quotation → yutong_quotations (status: draft/sent)
     ↓ (confirm)
Order → yutong_orders + yutong_payment_schedules
     ↓ (payment)
Payment → yutong_payments (pending verification)
     ↓ (finance verify)
GL Entry → DR Bank / CR Customer Advance
     ↓ (system invoice)
AR Invoice → ar_invoices
GL Entry → DR Trade Receivable / CR Sales Revenue
GL Entry → DR Customer Advance / CR Trade Receivable (apply advances)
```

---

### 1.5 Sinotruck Sales (SNT)
**Page:** `/sinotruck-sales`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Truck Model Setup | Add Sinotruck models with specs | Models available |
| 2 | Create Quotation | Select model, calculate price | Quotation created |
| 3 | Confirm & Create Order | Convert to order | Order journey initiated |
| 4 | Record Payment | Enter payment | Payment pending verification |
| 5 | Finance Verify | Approve with signature | GL: DR Bank / CR Advance |
| 6 | Generate Invoice | System invoice generation | AR Invoice + Revenue GL |

*Same flow as Yutong with business_unit_code = SNT*

---

### 1.6 Light Vehicle Sales (LTV)
**Page:** `/lightvehicle-sales`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Vehicle Model Setup | Add light vehicle models | Models available |
| 2 | Create Quotation | Customer details, model, price | Quotation created |
| 3 | Convert to Order | Confirm quotation → order | 8-stage journey + 30-task checklist |
| 4 | Payment Collection | Record payments | GL on verification |
| 5 | Invoice Generation | System invoice approval | AR Invoice created |

*Same flow as Yutong with business_unit_code = LTV*

---

### 1.7 Fleet Management
**Page:** `/fleet`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Bus Registration | Add bus with details | Bus record created |
| 2 | Bus Master Data Sheet | View complete bus profile | All financial data aggregated |
| 3 | Service Scheduling | Schedule maintenance | Maintenance record |
| 4 | Bus Loan Management | Add loan for bus | Loan linked to finance |
| 5 | Insurance Tracking | Add insurance policy | Insurance alerts |
| 6 | Tyre Management | Track tyre lifecycle | Cost per KM analysis |
| 7 | Odometer Tracking | Update mileage | Fuel efficiency calculation |

**Bus Master Data Integration:**
```text
Bus Record
├── Overview (Registration, Owner)
├── Trips (revenue, km tracked)
├── Fuel (consumption, efficiency)
├── Maintenance (cost, schedule)
├── Tyres (lifecycle, cost)
├── Loans (leasing finance integration)
└── Documents (insurance, permits)
```

---

### 1.8 Maintenance Management
**Page:** `/maintenance`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Schedule Maintenance | Create job order | Job scheduled |
| 2 | Bay Assignment | Assign to maintenance bay | Bay tracking |
| 3 | Start Timer | Begin work timer | Labor hours tracked |
| 4 | Record Parts/Labor | Add costs | maintenance_financials updated |
| 5 | Complete Job | Mark complete | Total cost calculated |
| 6 | Financial Summary | View cost breakdown | Parts + Labor + Profit margin |

---

### 1.9 Insurance Management
**Page:** `/insurance`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Add Policy | Add insurance policy for bus | Policy tracked |
| 2 | Expiry Alerts | View expiring policies | Alerts generated |
| 3 | Accident Claims | Record accident, link to policy | Claim tracking |
| 4 | Document Upload | Attach policy documents | Documents stored |

---

### 1.10 Driver Allocation
**Page:** `/driver-allocation`

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Daily Allocation | Assign driver/conductor to bus/route | Allocation for date |
| 2 | Import to Trips | Import allocation to daily trips | Pre-fill trip data |
| 3 | View History | Historical allocations | Audit trail |

---

### 1.11 Expense Requests (Cross-Module)
**Page:** `/accounting` → Expenses Module

| # | Test Case | Steps | Expected Finance Integration |
|---|-----------|-------|------------------------------|
| 1 | Create Request | Operations creates expense request | 21 categories available |
| 2 | Attach Receipt | Upload receipt image | Document attached |
| 3 | Finance Review | Finance reviews, assigns vendor | Vendor linked |
| 4 | Approve | Approve expense request | AP Invoice created |
| 5 | Pay | Record payment | GL: DR Expense / CR Bank |
| 6 | Petty Cash Settlement | Settle via petty cash | Petty cash balance updated |
| 7 | IOU Settlement | Settle staff advance (IOU) | IOU record updated |

---

## SECTION 2: FINANCE ERP MODULES

### 2.1 General Ledger (GL)
**Page:** `/accounting` → GL Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | View Chart of Accounts | Open COA tree view | Hierarchical account structure |
| 2 | Create Account | Add new GL account | Account with parent, type |
| 3 | Account Drill-Down | Click account → view transactions | All journal lines for account |
| 4 | Manual Journal Entry | Create JE with debits/credits | Balanced entry posted |
| 5 | View Journal Entries | List all journal entries | Searchable, filterable list |
| 6 | Recurring Entries | Create recurring template | Auto-posts on schedule |
| 7 | Financial Periods | Open/close periods | Period status controls posting |
| 8 | Multi-Currency | Add currency, set exchange rates | FX conversion applied |
| 9 | Period Closing Checklist | Run closing procedures | All checks completed |
| 10 | Pending Approvals | Review pending JEs | Approve/reject workflow |

**COA Balance Update Logic:**
```text
Account Type = Debit Normal (Assets, Expenses):
  - Debit increases balance
  - Credit decreases balance

Account Type = Credit Normal (Liabilities, Revenue, Equity):
  - Credit increases balance
  - Debit decreases balance
```

---

### 2.2 Accounts Receivable (AR)
**Page:** `/accounting` → AR Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Create Customer | Add customer with billing address | Customer record |
| 2 | Create AR Invoice | Select customer, add lines | Invoice with due date |
| 3 | Approve Invoice | Approve for payment | Status: unpaid |
| 4 | Record Receipt | Enter payment amount | AR Receipt, balance updated |
| 5 | Mark Full Payment | Use "Mark Full Payment" button | Full allocation |
| 6 | Advance Receipt | Record advance (is_advance=true) | Unallocated advance |
| 7 | Allocate Advance | Apply to invoice | Balance reduced |
| 8 | Print Invoice | Preview → Print | Uses company template |
| 9 | Print Receipt | Preview receipt | Template with signature |
| 10 | Credit Note | Create AR credit note | Reduces balance |
| 11 | Ageing Report | View AR ageing | Current/30/60/90+ days |
| 12 | Reconciliation | Reconcile AR balances | Match to GL |

**AR Document Templates:**
```text
Template Selection Flow:
1. Invoice has business_unit_code (e.g., "YUT")
2. Modal resolves YUT → Yutong Sales company_id
3. Filters templates for Yutong Sales
4. Applies header_mode (header_image or logo_and_html)
5. Replaces {{customer_*}} placeholders from invoice.customers
```

---

### 2.3 Accounts Payable (AP)
**Page:** `/accounting` → AP Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Create Vendor | Add vendor with details | Vendor record |
| 2 | Create AP Invoice | Select vendor, add lines | Invoice pending |
| 3 | Approve Invoice | Approve for payment | Status: approved |
| 4 | Quick Approve | Use quick approve in payment form | Batch approval |
| 5 | Record Payment | Enter payment amount | AP Payment + GL |
| 6 | WHT Deduction | Add withholding tax | WHT Certificate |
| 7 | Print Invoice | Preview vendor invoice | Template applied |
| 8 | Debit Note | Create AP debit note | Reduces liability |
| 9 | Ageing Report | View AP ageing | Days outstanding |
| 10 | Payment Batch | Create batch payment | Multiple vendors |

**AP Approval Gate:**
```text
Invoice Created (status: pending)
         ↓
  ┌──────────────────┐
  │  Approval Gate   │ ← Invoice invisible to payment form
  └──────────────────┘
         ↓ (approve)
Invoice Status: approved → Now visible for payment
         ↓ (pay)
GL Entry: DR Trade Payable / CR Bank
Bank Transaction recorded
```

---

### 2.4 Selling Module
**Page:** `/accounting` → Selling Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Create Sales Order | Customer, items, pricing | Order created |
| 2 | Create Delivery Note | From sales order | Delivery tracked |
| 3 | Pick List | Generate picking list | Warehouse picking |
| 4 | Convert to Invoice | Create invoice from DO | AR Invoice |

---

### 2.5 Inventory Module
**Page:** `/accounting` → Inventory Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Item Master | Create inventory items | Items with UoM |
| 2 | Warehouse Management | Multiple warehouses, bins | Location tracking |
| 3 | Stock Adjustment | Adjust quantities | Stock updated |
| 4 | Stock Transfer | Move between warehouses | Transfer recorded |
| 5 | Batch/Serial Tracking | Track by batch or serial | Traceability |
| 6 | Price Lists | Customer-specific pricing | Price rules |
| 7 | Composite Items | Bill of Materials | BOM structure |
| 8 | Landed Cost | Allocate import costs | Cost updated |
| 9 | Inventory Ageing | Stock age analysis | Old stock identified |
| 10 | Stock Reconciliation | Physical count | Adjustments posted |

---

### 2.6 Procurement Module
**Page:** `/accounting` → Procurement Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Purchase Requisition | Internal request | Requisition created |
| 2 | Request for Quotation | Send RFQ to vendors | RFQ sent |
| 3 | Supplier Quotation | Record vendor quotes | Quote comparison |
| 4 | Purchase Order | Create PO | Order to vendor |
| 5 | Goods Receipt Note | Receive goods | GRN created |
| 6 | Invoice Matching | 3-way match (PO, GRN, Invoice) | Verification |
| 7 | Vendor Performance | Score vendors | Performance metrics |

---

### 2.7 Banking Module
**Page:** `/accounting` → Banking Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Bank Accounts | Add bank accounts | Account with GL link |
| 2 | Bank Transactions | Record deposits/withdrawals | Transaction logged |
| 3 | Inter-Bank Transfer | Transfer between accounts | DR Dest Bank / CR Source Bank |
| 4 | Bank Reconciliation | Match statement to records | Reconciled balance |
| 5 | Cashbook | View cash transactions | Cash flow |
| 6 | Cheque Register | Track issued cheques | Cheque status |
| 7 | Payment Batch | Bulk vendor payments | Multiple payments |

---

### 2.8 Fixed Assets Module
**Page:** `/accounting` → Fixed Assets Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Asset Categories | Create asset types | Depreciation rules |
| 2 | Asset Registration | Add asset with purchase | Asset record |
| 3 | Depreciation Run | Run for period | JE: DR Depreciation Expense / CR Accumulated Dep |
| 4 | Asset Transfer | Move between locations | Transfer recorded |
| 5 | Asset Disposal | Dispose asset | Gain/loss calculated |
| 6 | Asset Revaluation | Revalue asset | New book value |
| 7 | Asset Maintenance | Schedule maintenance | Maintenance tasks |

---

### 2.9 Quality Module
**Page:** `/accounting` → Quality Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Inspection Templates | Define inspection criteria | Template created |
| 2 | Quality Inspection | Perform inspection | Pass/fail recorded |
| 3 | Link to GRN | Inspect received goods | Quality gate |

---

### 2.10 Automation Module
**Page:** `/accounting` → Automation Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Recurring Invoices | Set up recurring billing | Auto-generates invoices |
| 2 | Payment Reminders | Configure reminder rules | Auto-sends reminders |
| 3 | Workflow Rules | Create trigger-based rules | Automated actions |
| 4 | Scheduled Tasks | View scheduled jobs | Task execution logs |

---

### 2.11 Reports Module
**Page:** `/accounting` → Reports Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Financial Statements | P&L, Balance Sheet | Standard reports |
| 2 | Trial Balance | Generate trial balance | Debit = Credit |
| 3 | Cash Flow Statement | Direct/indirect method | Cash movements |
| 4 | Report Builder | Custom report builder | Ad-hoc reports |
| 5 | Cash Flow Forecast | 90-day projection | Scenario modeling |
| 6 | Report Scheduler | Schedule report delivery | Auto-delivery |
| 7 | Segment Report | By department/project | Dimensional analysis |
| 8 | Tax Return Generator | Generate tax returns | Compliance |

---

### 2.12 Settings Module
**Page:** `/accounting` → Settings Module

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Company Management | Manage company details | Logo, address, phone |
| 2 | Document Templates | Create/edit templates | Template library |
| 3 | Initialize Templates | Seed all templates | All companies initialized |
| 4 | Module Integration | Configure finance settings | GL mappings set |
| 5 | Balance Reconciliation | Run balance tool | COA balances reconciled |
| 6 | API & Webhooks | Configure integrations | API keys, webhooks |
| 7 | Approval Config | Set approval workflows | Multi-level approvals |
| 8 | Payment Terms | Configure payment terms | Terms library |

---

## SECTION 3: INTEGRATION HUB

### 3.1 Vendor Portal
**Page:** `/vendor-portal`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Vendor Login | OTP authentication | Vendor access |
| 2 | View POs | See purchase orders | PO list |
| 3 | Acknowledge PO | Accept/reject order | Status updated |
| 4 | Submit Invoice | Upload invoice | vendor_submitted_invoices |
| 5 | Track Payments | View payment status | Payment history |

### 3.2 Customer Portal
**Page:** `/customer-portal`

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Customer Login | Authentication | Customer access |
| 2 | View Invoices | See AR invoices | Invoice list |
| 3 | View Statements | Account statement | Balance summary |

---

## SECTION 4: GLOBAL SETTINGS

### 4.1 Module Finance Settings
**Page:** `/settings`

| Module | Tab | Key Settings |
|--------|-----|--------------|
| School Bus | school-bus-finance | Revenue, Receivable, Bank per branch |
| Special Hire | special-hire-finance | Revenue, Advance, Expense accounts |
| Yutong | yutong-finance | Revenue, Receivable, Advance, Bank |
| Sinotruck | sinotruck-finance | Revenue, Receivable, Advance, Bank |
| Light Vehicle | lightvehicle-finance | Revenue, Receivable, Advance, Bank |
| NCG Express | ncgexpress-finance | Revenue, Expense, Cash accounts |
| Leasing | leasing-finance | Liability, Interest, Bank accounts |

### 4.2 Numbering Settings
**Page:** `/settings` → Numbering

| Entity | Format Example |
|--------|----------------|
| Customer | CUST-YYYY-NNNN |
| Vendor | VEND-YYYY-NNNN |
| AR Invoice | INV-YYYYMMDD-XXXX |
| AP Invoice | APINV-YYYY-NNNN |
| Journal Entry | JE-YYYY-NNNN |
| Receipt | REC-YYYY-NNNN |

---

## SECTION 5: MASTER DATA FLOW

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE OPERATION → FINANCE FLOW                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  OPERATIONS                              FINANCE                        ACCOUNTING       │
│  ─────────                              ───────                        ──────────       │
│                                                                                          │
│  ┌────────────┐                         ┌────────────┐                 ┌────────────┐   │
│  │ Quotation  │──────────────────────▶  │  Customer  │────────────────▶│ AR Invoice │   │
│  │  Created   │                         │  Created   │                 │  Created   │   │
│  └────────────┘                         └────────────┘                 └────────────┘   │
│        │                                                                      │         │
│        ▼                                                                      ▼         │
│  ┌────────────┐                         ┌────────────┐                 ┌────────────┐   │
│  │   Order    │──────────────────────▶  │  Payment   │────────────────▶│  Journal   │   │
│  │ Confirmed  │                         │  Received  │                 │   Entry    │   │
│  └────────────┘                         └────────────┘                 └────────────┘   │
│        │                                       │                              │         │
│        ▼                                       ▼                              ▼         │
│  ┌────────────┐                         ┌────────────┐                 ┌────────────┐   │
│  │  Invoice   │──────────────────────▶  │ AR Receipt │────────────────▶│    COA     │   │
│  │ Generated  │                         │  Created   │                 │  Updated   │   │
│  └────────────┘                         └────────────┘                 └────────────┘   │
│        │                                                                      │         │
│        ▼                                                                      ▼         │
│  ┌────────────┐                                                        ┌────────────┐   │
│  │  Document  │────────────────────────────────────────────────────────▶│  Template  │   │
│  │    PDF     │                                                        │  Rendered  │   │
│  └────────────┘                                                        └────────────┘   │
│                                                                                          │
│  EXPENSE FLOW                                                                            │
│  ────────────                                                                            │
│                                                                                          │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐               │
│  │  Expense   │────▶│  Finance   │────▶│ AP Invoice │────▶│ AP Payment │               │
│  │  Request   │     │  Approval  │     │  Created   │     │  Recorded  │               │
│  └────────────┘     └────────────┘     └────────────┘     └────────────┘               │
│                                                                  │                      │
│                                                                  ▼                      │
│                                                           ┌────────────┐               │
│                                                           │  Journal   │               │
│                                                           │   Entry    │               │
│                                                           └────────────┘               │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## SECTION 6: SUGGESTED ADDITIONS

Based on the current system, here are features that could enhance the platform:

| # | Suggested Feature | Description | Priority |
|---|-------------------|-------------|----------|
| 1 | Email Notifications | Auto-send invoice/receipt PDFs via email | High |
| 2 | SMS Payment Reminders | Integrate SMS gateway for reminders | High |
| 3 | Stripe Payment Gateway | Online payment collection | Medium |
| 4 | Mobile App | React Native app for field operations | Medium |
| 5 | Dashboard Widgets | Customizable executive dashboard | Medium |
| 6 | Audit Trail Report | Comprehensive change logging | High |
| 7 | Multi-Language Support | Sinhala/Tamil translations | Low |
| 8 | Barcode/QR Inventory | Scan-based inventory management | Medium |
| 9 | GPS Fuel Verification | Match fuel purchases to GPS location | High |
| 10 | Payroll Integration | Staff salary calculations | High |
| 11 | Budgeting Module | Budget vs actual tracking | Medium |
| 12 | Document OCR | Auto-extract data from receipts | Medium |

---

## TESTING CHECKLIST SUMMARY

**Total Test Cases:**
- Operations: 50+ test cases
- Finance: 80+ test cases
- Integration: 10+ test cases
- Settings: 20+ test cases

**Priority Testing Order:**
1. Finance Settings (GL account mappings)
2. Master Data (Customers, Vendors)
3. AR/AP Basic Flows
4. Operations → Finance Integration
5. Document Generation
6. Reports & Dashboards

