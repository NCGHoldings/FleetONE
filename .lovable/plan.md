

# Comprehensive Fleet Leasing & NCG Express Finance Integration Plan

## Executive Summary

This plan integrates the Fleet Management Leasing system with the Finance ERP, enabling automated AP (Accounts Payable) creation, GL (General Ledger) posting, and enhanced reporting with bus-wise/route-wise filtering. Additionally, it completes the NCG Express finance mapping for daily trips and expenses.

---

## System Architecture Overview

### Current State
- **Leasing Module**: Standalone loan/EMI tracking with no finance connection
- **NCG Express**: Partial finance integration (GL posting only, no AP tracking)
- **Finance Reports**: No bus-wise or route-wise filtering capability

### Target State
- **Leasing**: Full AP integration with automated vendor creation, invoice generation, and GL posting
- **NCG Express**: Complete finance loop with route/bus P&L reporting
- **Finance Reports**: Multi-dimensional filtering (Bus, Route, Business Unit)

---

## PART A: Fleet Leasing Finance Integration

### A1. Database Schema Updates

#### New Table: `leasing_finance_settings`
```sql
CREATE TABLE leasing_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  business_unit_code VARCHAR(10) DEFAULT 'FLEET',
  
  -- Vendor/Lender mapping
  auto_create_vendor BOOLEAN DEFAULT true,
  
  -- GL Account Mappings
  bank_account_id UUID REFERENCES chart_of_accounts(id),        -- CR when paying
  leasing_liability_account_id UUID REFERENCES chart_of_accounts(id), -- Principal liability
  interest_expense_account_id UUID REFERENCES chart_of_accounts(id),  -- Interest expense
  lease_asset_account_id UUID REFERENCES chart_of_accounts(id),       -- For finance leases
  
  -- Automation
  auto_create_ap_invoice BOOLEAN DEFAULT true,
  auto_post_gl_on_payment BOOLEAN DEFAULT true,
  ap_prefix VARCHAR(20) DEFAULT 'LEASE-AP',
  gl_prefix VARCHAR(20) DEFAULT 'LEASE-GL',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Updates to `bus_loans` table
```sql
ALTER TABLE bus_loans ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
ALTER TABLE bus_loans ADD COLUMN IF NOT EXISTS business_unit_code VARCHAR(10) DEFAULT 'FLEET';
ALTER TABLE bus_loans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
```

#### Updates to `bus_loan_payments` table
```sql
ALTER TABLE bus_loan_payments ADD COLUMN IF NOT EXISTS ap_invoice_id UUID REFERENCES ap_invoices(id);
ALTER TABLE bus_loan_payments ADD COLUMN IF NOT EXISTS ap_payment_id UUID REFERENCES ap_payments(id);
ALTER TABLE bus_loan_payments ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id);
ALTER TABLE bus_loan_payments ADD COLUMN IF NOT EXISTS gl_posted BOOLEAN DEFAULT false;
```

---

### A2. Leasing to Finance Flow Diagram

```
+===============================================================================+
|                    FLEET LEASING FINANCE INTEGRATION FLOW                      |
+===============================================================================+

+------------------------+     +------------------------+     +------------------------+
|     OPERATIONS         |     |      FINANCE           |     |    GENERAL LEDGER      |
|    (Fleet Module)      |     |   (AP Module)          |     |    (Accounting)        |
+------------------------+     +------------------------+     +------------------------+
          |                              |                              |
          v                              |                              |
+-------------------+                    |                              |
| 1. CREATE LOAN    |                    |                              |
| - Loan Amount     |                    |                              |
| - Interest Rate   |                    |                              |
| - Lender (Bank)   |                    |                              |
| - Tenure          |                    |                              |
+-------------------+                    |                              |
          |                              |                              |
          | Auto-trigger                 |                              |
          v                              |                              |
+-------------------+     Creates        +-------------------+          |
| 2. AUTO-CREATE    |----------------->  | FINANCE VENDOR    |          |
|    VENDOR         |                    | (Bank/Lender)     |          |
| - Lender Name     |                    | - vendor_code     |          |
| - Contact         |                    | - vendor_name     |          |
| - Business Unit   |                    | - contact_info    |          |
+-------------------+                    +-------------------+          |
          |                                       |                     |
          | Generate Schedule                     |                     |
          v                                       |                     |
+-------------------+                             |                     |
| 3. AMORTIZATION   |                             |                     |
|    SCHEDULE       |                             |                     |
| - Payment 1: Due  |                             |                     |
| - Payment 2: Due  |                             |                     |
| - Payment N: Due  |                             |                     |
+-------------------+                             |                     |
          |                                       |                     |
          | For each scheduled payment            |                     |
          v                                       v                     |
+-------------------+     Auto-Create     +-------------------+         |
| 4. PAYMENT DUE    |------------------>  | AP INVOICE        |         |
|    DATE REACHED   |                     | - Invoice No      |         |
| (Scheduled EMI)   |                     | - Principal       |         |
|                   |                     | - Interest        |         |
+-------------------+                     | - Total EMI       |         |
          |                               | - Status: Unpaid  |         |
          |                               +-------------------+         |
          |                                       |                     |
          | Mark Payment                          |                     |
          v                                       v                     |
+-------------------+     Auto-Create     +-------------------+         |
| 5. PAYMENT MADE   |------------------>  | AP PAYMENT        |         |
| - Actual Date     |                     | - Payment No      |         |
| - Amount Paid     |                     | - Amount          |         |
| - Reference No    |                     | - Allocated to    |         |
+-------------------+                     |   AP Invoice      |         |
          |                               +-------------------+         |
          |                                       |                     |
          |                                       | Auto-Post          |
          |                                       v                     v
          |                               +-------------------+ +-------------------+
          |                               | GL JOURNAL ENTRY  | | COA BALANCE       |
          |                               +-------------------+ | UPDATES           |
          |                               | DR Interest Exp   | +-------------------+
          |                               |    Rs XXX         | | - Bank (CR)       |
          |                               | DR Lease Liab.    | | - Interest (DR)   |
          |                               |    Rs XXX         | | - Liability (DR)  |
          |                               | CR Bank/Cash      | +-------------------+
          |                               |    Rs XXX (EMI)   |
          |                               +-------------------+
          |                                       |
          | Update Status                         |
          v                                       v
+-------------------+                     +-------------------+
| 6. LOAN STATUS    |                     | AP INVOICE STATUS |
| - paid_count++    |                     | - Status: Paid    |
| - balance_down    |                     | - Linked to JE    |
+-------------------+                     +-------------------+
```

---

### A3. Double Entry Accounting for Leasing

#### Initial Loan Recognition (When loan is created - Finance Lease)
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| Leased Asset (Fixed Asset) | Rs 5,000,000 | | Asset under finance lease |
| Lease Liability (Liability) | | Rs 5,000,000 | Total obligation to lender |

#### Monthly EMI Payment (Each installment)
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| Interest Expense (Expense) | Rs 35,000 | | Interest portion of EMI |
| Lease Liability (Liability) | Rs 48,333 | | Principal portion of EMI |
| Bank Account (Asset) | | Rs 83,333 | Total EMI payment |

---

### A4. Implementation Files

#### New Files to Create:

1. **`src/hooks/useLeasingFinance.ts`**
   - `useLeasingFinanceSettings()` - Fetch settings
   - `useAutoCreateVendor()` - Create vendor from lender
   - `useAutoCreateAPInvoice()` - Generate AP from schedule
   - `usePostLeasingPaymentToGL()` - GL posting on payment

2. **`src/components/settings/LeasingFinanceSettings.tsx`**
   - GL account mapping UI
   - Automation toggles
   - JE prefix configuration

3. **`src/components/fleet/LeasingFinanceStatusBadge.tsx`**
   - Shows AP/GL status on loan dashboard

4. **`src/components/fleet/LeasingPaymentWithFinance.tsx`**
   - Enhanced payment modal with finance integration

---

## PART B: NCG Express Complete Finance Integration

### B1. Current vs Target State

#### Current State:
- Daily Trips: GL posting only (DR Cash / CR Revenue)
- Daily Expenses: GL posting only (DR Expense / CR Cash)
- No bus-wise P&L breakdown
- No route-wise profitability

#### Target State:
- Complete P&L by Bus
- Complete P&L by Route
- Trip-level cost allocation
- Financial reporting with multi-dimensional filters

---

### B2. NCG Express Finance Flow Diagram

```
+===============================================================================+
|                    NCG EXPRESS FINANCE INTEGRATION FLOW                        |
+===============================================================================+

+---------------------------+          +---------------------------+
|      DAILY TRIP ENTRY     |          |   DAILY BUS EXPENSES      |
+---------------------------+          +---------------------------+
| - Date                    |          | - Date                    |
| - Bus ID                  |          | - Bus ID                  |
| - Route ID                |          | - 21 Expense Categories   |
| - Ticket Income           |          | - Fuel, Repairs, Salary...|
| - Departure/Arrival       |          |                           |
+---------------------------+          +---------------------------+
          |                                      |
          | On Save/Approve                      | On Save/Approve
          v                                      v
+---------------------------+          +---------------------------+
| GL REVENUE POSTING        |          | GL EXPENSE POSTING        |
+---------------------------+          +---------------------------+
| Entry: NCGE-REV-BUS-DATE  |          | Entry: NCGE-EXP-BUS-DATE  |
|                           |          |                           |
| DR Cash Account           |          | DR Fuel Expense           |
|    Rs 45,000              |          |    Rs 8,000               |
|                           |          | DR Repair Expense         |
| CR Ticket Revenue         |          |    Rs 2,000               |
|    Rs 45,000              |          | DR Salary Expense         |
|                           |          |    Rs 5,000               |
+---------------------------+          | DR Highway Expense        |
          |                            |    Rs 1,500               |
          |                            | ... (other categories)    |
          |                            |                           |
          |                            | CR Cash/Bank              |
          |                            |    Rs 16,500              |
          |                            +---------------------------+
          |                                      |
          +----------------+--------------------+
                           |
                           v
              +---------------------------+
              |    LEDGER WITH FILTERS    |
              +---------------------------+
              | Filters:                  |
              | - Bus (NC-1234, NC-5678)  |
              | - Route (CMB-KDY, CMB-GLI)|
              | - Date Range              |
              | - Business Unit           |
              +---------------------------+
                           |
                           v
              +---------------------------+
              |    BUS-WISE P&L REPORT    |
              +---------------------------+
              | Bus NC-1234:              |
              | Revenue: Rs 450,000       |
              | Expenses: Rs 320,000      |
              | Net Profit: Rs 130,000    |
              | Profit Margin: 28.9%      |
              +---------------------------+
                           |
                           v
              +---------------------------+
              |   ROUTE-WISE P&L REPORT   |
              +---------------------------+
              | Route CMB-KDY:            |
              | Revenue: Rs 850,000       |
              | Expenses: Rs 580,000      |
              | Net Profit: Rs 270,000    |
              | Avg Cost/Trip: Rs 8,285   |
              +---------------------------+
```

---

### B3. Database Schema Updates for Enhanced Filtering

#### Updates to `journal_entry_lines`
```sql
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id);
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES daily_trips(id);
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS expense_id UUID REFERENCES daily_bus_expenses(id);
```

#### Create indexes for performance
```sql
CREATE INDEX IF NOT EXISTS idx_je_lines_bus_id ON journal_entry_lines(bus_id);
CREATE INDEX IF NOT EXISTS idx_je_lines_route_id ON journal_entry_lines(route_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_unit ON journal_entries(business_unit_code);
```

---

### B4. Implementation Files for NCG Express

#### Updated Files:

1. **`src/hooks/useNCGExpressFinance.ts`** (Update)
   - Add bus_id and route_id to journal entry lines
   - Enhanced bulk posting with metadata

2. **`src/components/accounting/COADrillDownModal.tsx`** (Update)
   - Add Bus filter dropdown
   - Add Route filter dropdown

3. **`src/components/ncg-express/BusProfitabilityReport.tsx`** (New)
   - Bus-wise P&L breakdown

4. **`src/components/ncg-express/RouteProfitabilityReport.tsx`** (New)
   - Route-wise profitability analysis

---

## PART C: Enhanced Finance Reporting

### C1. Ledger Drill-Down Enhancement

```
+===========================================================================+
|                         ENHANCED LEDGER DRILL-DOWN                         |
+===========================================================================+

+------------------------------------------------------------------+
|  CHART OF ACCOUNTS - DRILL DOWN VIEW                              |
+------------------------------------------------------------------+
|  Account: Fuel Expense (50100)                                   |
|  Current Balance: Rs 1,245,000                                   |
+------------------------------------------------------------------+
|                                                                   |
|  FILTERS:                                                         |
|  +------------------+ +------------------+ +------------------+   |
|  | Business Unit    | | Bus              | | Route            |   |
|  | [v] NCGE         | | [v] NC-1234      | | [v] CMB-KDY      |   |
|  | [ ] SBO          | | [v] NC-5678      | | [v] CMB-GLI      |   |
|  | [ ] SPH          | | [ ] NC-9012      | | [ ] CMB-ANU      |   |
|  +------------------+ +------------------+ +------------------+   |
|                                                                   |
|  +---------------+ +---------------+                              |
|  | Date From     | | Date To       |                              |
|  | [2025-01-01]  | | [2025-01-31]  |                              |
|  +---------------+ +---------------+                              |
|                                                                   |
+------------------------------------------------------------------+
|  DATE       | DESCRIPTION              | DR      | CR     | BAL   |
+------------------------------------------------------------------+
|  01-Jan     | Fuel - NC-1234 CMB-KDY   | 8,000   |   -    | 8,000 |
|  01-Jan     | Fuel - NC-5678 CMB-GLI   | 6,500   |   -    |14,500 |
|  02-Jan     | Fuel - NC-1234 CMB-KDY   | 7,800   |   -    |22,300 |
|  ...        | ...                      | ...     | ...    | ...   |
+------------------------------------------------------------------+
|  TOTALS     |                          |125,000  | 5,000  |120,000|
+------------------------------------------------------------------+
|                                                                   |
|  [ Export CSV ]  [ Export PDF ]  [ Print Report ]                 |
+------------------------------------------------------------------+
```

---

## PART D: Complete System Integration Diagram

```
+===============================================================================================+
|                              NCG FLEETFLOW - COMPLETE FINANCE INTEGRATION                       |
+===============================================================================================+

                                    +------------------+
                                    |   COMPANY        |
                                    |   SWITCHER       |
                                    +------------------+
                                           |
            +------------------------------+------------------------------+
            |                              |                              |
            v                              v                              v
    +---------------+              +---------------+              +---------------+
    |  NCG HOLDING  |              | NCG EXPRESS   |              | SUB-COMPANIES |
    | (Consolidated)|              | (Standalone)  |              | SBO,SPH,YUT.  |
    +---------------+              +---------------+              +---------------+
            |                              |                              |
            v                              v                              v
+========================================================================================+

OPERATIONS LAYER:
+------------------------+     +------------------------+     +------------------------+
|   FLEET MANAGEMENT     |     |   NCG EXPRESS          |     |   SPECIAL HIRE / SBO   |
+------------------------+     +------------------------+     +------------------------+
| - Bus Master Data      |     | - Daily Trips          |     | - Quotations           |
| - Leasing/Loans        |     | - Daily Bus Expenses   |     | - Trip Assignments     |
| - Maintenance          |     | - Route Management     |     | - School Contracts     |
| - Tyre Management      |     | - Crew Management      |     |                        |
+------------------------+     +------------------------+     +------------------------+
         |                              |                              |
         | Finance                      | Finance                      | Finance
         | Integration                  | Integration                  | Integration
         v                              v                              v
+========================================================================================+

FINANCE INTEGRATION LAYER:
+------------------------+     +------------------------+     +------------------------+
|  LEASING FINANCE       |     |  NCGE FINANCE          |     |  SPH/SBO FINANCE       |
+------------------------+     +------------------------+     +------------------------+
| Settings Table:        |     | Settings Table:        |     | Settings Tables:       |
| - Bank Account         |     | - Cash Account         |     | - Bank Account         |
| - Lease Liability      |     | - Revenue Account      |     | - Advance Account      |
| - Interest Expense     |     | - 21 Expense Accounts  |     | - Receivable Account   |
| - Asset Account        |     | - Auto-post toggles    |     | - Revenue Accounts     |
+------------------------+     +------------------------+     +------------------------+
         |                              |                              |
         | Auto-Create                  | Auto-Post                    | Auto-Create
         v                              v                              v
+========================================================================================+

ACCOUNTING LAYER:
+------------------------+     +------------------------+     +------------------------+
|   VENDORS (AP)         |     |   CUSTOMERS (AR)       |     |   JOURNAL ENTRIES      |
+------------------------+     +------------------------+     +------------------------+
| - Lenders/Banks        |     | - Trip Customers       |     | - Posted Entries       |
| - Expense Suppliers    |     | - School Bus Contracts |     | - Audit Trail          |
| - Service Providers    |     | - Special Hire Clients |     | - Balance Updates      |
+------------------------+     +------------------------+     +------------------------+
         |                              |                              |
         v                              v                              v
+------------------------+     +------------------------+     +------------------------+
|   AP INVOICES          |     |   AR INVOICES          |     |   JOURNAL LINES        |
+------------------------+     +------------------------+     +------------------------+
| - Lease EMI Invoices   |     | - Trip Invoices        |     | - bus_id (NEW)         |
| - Expense Invoices     |     | - School Billing       |     | - route_id (NEW)       |
| - Vendor Bills         |     | - Hire Invoices        |     | - Business Unit        |
+------------------------+     +------------------------+     +------------------------+
         |                              |                              |
         v                              v                              v
+------------------------+     +------------------------+     +------------------------+
|   AP PAYMENTS          |     |   AR RECEIPTS          |     |   COA BALANCES         |
+------------------------+     +------------------------+     +------------------------+
| - EMI Payments         |     | - Customer Payments    |     | - Real-time Updates    |
| - Expense Settlements  |     | - Advance Receipts     |     | - Drill-down Ready     |
+------------------------+     +------------------------+     +------------------------+
         |                              |                              |
         +------------------------------+------------------------------+
                                        |
                                        v
+========================================================================================+

REPORTING LAYER:
+------------------------+     +------------------------+     +------------------------+
|   BUS-WISE REPORTS     |     |   ROUTE-WISE REPORTS   |     |   PERIOD REPORTS       |
+------------------------+     +------------------------+     +------------------------+
| - P&L per Bus          |     | - Revenue per Route    |     | - Trial Balance        |
| - Expense Breakdown    |     | - Profitability        |     | - Income Statement     |
| - Lease Status         |     | - Cost per KM          |     | - Balance Sheet        |
| - Asset Value          |     | - Efficiency Metrics   |     | - Cash Flow            |
+------------------------+     +------------------------+     +------------------------+
```

---

## PART E: Implementation Roadmap

### Phase 1: Database & Settings (Week 1)
| Task | Files | Priority |
|------|-------|----------|
| Create `leasing_finance_settings` table | SQL Migration | High |
| Add finance columns to `bus_loans` | SQL Migration | High |
| Add finance columns to `bus_loan_payments` | SQL Migration | High |
| Add bus_id/route_id to `journal_entry_lines` | SQL Migration | High |
| Create `LeasingFinanceSettings.tsx` | New Component | High |

### Phase 2: Leasing Finance Hook (Week 2)
| Task | Files | Priority |
|------|-------|----------|
| Create `useLeasingFinance.ts` hook | New Hook | High |
| Auto-vendor creation logic | Hook function | High |
| AP Invoice generation from schedule | Hook function | High |
| GL posting on payment | Hook function | High |

### Phase 3: UI Integration (Week 3)
| Task | Files | Priority |
|------|-------|----------|
| Update `BusLoanDashboardModal.tsx` | Component Update | High |
| Add finance status badges | New Component | Medium |
| Integrate payment with AP/GL | Component Update | High |

### Phase 4: NCG Express Enhancement (Week 4)
| Task | Files | Priority |
|------|-------|----------|
| Update `useNCGExpressFinance.ts` | Hook Update | High |
| Add bus_id/route_id to GL posting | Hook Update | High |
| Create `BusProfitabilityReport.tsx` | New Component | Medium |
| Create `RouteProfitabilityReport.tsx` | New Component | Medium |

### Phase 5: Reporting Enhancement (Week 5)
| Task | Files | Priority |
|------|-------|----------|
| Update `COADrillDownModal.tsx` | Component Update | High |
| Add bus/route filter dropdowns | Component Update | High |
| Create multi-dimensional report queries | Hook Update | Medium |

---

## Technical Summary

### New Tables
1. `leasing_finance_settings` - GL mappings for leasing

### Updated Tables
- `bus_loans` - Add vendor_id, company_id, business_unit_code
- `bus_loan_payments` - Add ap_invoice_id, journal_entry_id, gl_posted
- `journal_entry_lines` - Add bus_id, route_id

### New Files
1. `src/hooks/useLeasingFinance.ts`
2. `src/components/settings/LeasingFinanceSettings.tsx`
3. `src/components/fleet/LeasingFinanceStatusBadge.tsx`
4. `src/components/ncg-express/BusProfitabilityReport.tsx`
5. `src/components/ncg-express/RouteProfitabilityReport.tsx`

### Updated Files
1. `src/components/fleet/BusLoanModal.tsx`
2. `src/components/fleet/BusLoanDashboardModal.tsx`
3. `src/hooks/useNCGExpressFinance.ts`
4. `src/components/accounting/COADrillDownModal.tsx`
5. `src/pages/Settings.tsx`

---

## Accounting Entries Summary

### Leasing Module
| Event | Debit | Credit |
|-------|-------|--------|
| Loan Created (Finance Lease) | Leased Asset | Lease Liability |
| Monthly EMI Payment | Interest Expense + Lease Liability | Bank Account |

### NCG Express
| Event | Debit | Credit |
|-------|-------|--------|
| Trip Revenue | Cash Account | Ticket Revenue |
| Bus Expenses | Expense Accounts (21 categories) | Cash Account |

This plan provides complete finance integration with proper double-entry accounting, automated workflows, and enhanced reporting capabilities for both the Leasing module and NCG Express operations.

