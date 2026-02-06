
# School Bus Fuel Expense & Finance Integration System

## Executive Summary

This plan creates a complete interconnected system for School Bus Operations (SBO) fuel expense management with:
1. Dedicated Fuel Bank Account mapping per branch
2. Automated fuel expense recording with GL posting
3. Inter-bank fund transfer functionality with proper double entries
4. Real-time COA balance updates
5. Complete audit trail from operation to finance

---

## Current State Analysis

### What Exists:
- `school_bus_finance_settings` table has `fuel_expense_account_id` for GL expense account
- `expense_cash_account_id` for general expense cash account
- Branch-wise settings with `branch_gl_account_id`
- `ExpenseRequestForm` component for creating expense requests
- `bank_transactions` table with transfer_in/transfer_out types
- Bank transaction form with basic transfer functionality

### What's Missing:
1. **No dedicated Fuel Bank Account mapping** - branches need specific fuel bank accounts
2. **No branch-wise fuel bank mapping** - each branch may use different fuel banks
3. **No automated GL posting for fuel expenses** - currently manual process
4. **No inter-bank fund transfer with GL entries** - basic transfer exists but no accounting integration
5. **No fuel expense-to-AP workflow** - fuel bills not creating AP invoices automatically

---

## Solution Architecture

### Part 1: Database Schema Updates

#### Add Fuel Bank Account Column to Settings
```sql
ALTER TABLE school_bus_finance_settings 
ADD COLUMN IF NOT EXISTS fuel_bank_account_id UUID REFERENCES chart_of_accounts(id);
```

#### Create Inter-Bank Transfer Table
```sql
CREATE TABLE inter_bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  transfer_number VARCHAR(50) NOT NULL,
  transfer_date DATE NOT NULL,
  
  -- Source Bank
  from_bank_account_id UUID REFERENCES bank_accounts(id) NOT NULL,
  from_gl_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  
  -- Destination Bank
  to_bank_account_id UUID REFERENCES bank_accounts(id) NOT NULL,
  to_gl_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  
  amount NUMERIC(15,2) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  
  -- Journal Entry Link
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Part 2: Complete System Flow

```
+================================================================================+
|           SCHOOL BUS FUEL EXPENSE & FINANCE INTEGRATION FLOW                    |
+================================================================================+

                           FUND MANAGEMENT
+----------------+     +------------------+     +------------------+
|   MAIN BANK    |     |   FUND TRANSFER  |     |   FUEL BANK      |
| (Company Bank) |---->|   DR Fuel Bank   |---->| (Dedicated Fuel) |
|                |     |   CR Main Bank   |     |                  |
+----------------+     +------------------+     +------------------+
                              |                         |
                              v                         |
                       +--------------+                 |
                       | JE Created   |                 |
                       | + COA Update |                 |
                       +--------------+                 |
                                                        |
                                                        v
                          EXPENSE WORKFLOW
+----------------+     +------------------+     +------------------+
|   OPERATIONS   |     |   EXPENSE PAGE   |     |   FINANCE TEAM   |
| (Branch Staff) |---->| Add Fuel Expense |---->|  Review/Approve  |
|                |     | - Amount         |     |                  |
+----------------+     | - Fuel Station   |     +------------------+
                       | - Branch         |              |
                       | - Bus (optional) |              |
                       +------------------+              |
                              |                         |
                              v                         v
                       +--------------+          +--------------+
                       | GL AUTO-POST |<---------|  AP INVOICE  |
                       +--------------+          | (if vendor)  |
                       | DR Fuel Exp  |          +--------------+
                       | CR Fuel Bank |
                       +--------------+
                              |
                              v
                       +--------------+
                       | COA BALANCE  |
                       | UPDATE       |
                       +--------------+
                       | - Fuel Exp (+)|
                       | - Fuel Bank(-)|
                       +--------------+
```

---

### Part 3: GL Double Entry Mappings

#### 1. Fund Transfer (Main Bank to Fuel Bank)
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| Fuel Bank (Asset) | Rs 500,000 | | Increase fuel bank balance |
| Main Bank (Asset) | | Rs 500,000 | Decrease main bank balance |

#### 2. Fuel Expense Recording
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| Fuel Expense | Rs 25,000 | | Expense for fuel purchase |
| Fuel Bank (Asset) | | Rs 25,000 | Payment from fuel bank |

#### 3. If Fuel Bill Goes Through AP (Credit Purchase)
**Step 1: AP Invoice Created**
| Account | Debit | Credit |
|---------|-------|--------|
| Fuel Expense | Rs 25,000 | |
| Trade Payable | | Rs 25,000 |

**Step 2: AP Payment**
| Account | Debit | Credit |
|---------|-------|--------|
| Trade Payable | Rs 25,000 | |
| Fuel Bank | | Rs 25,000 |

---

### Part 4: Implementation Files

#### New Files to Create:

| File | Purpose |
|------|---------|
| `src/hooks/useFuelExpenseFinance.ts` | Hook for fuel expense GL posting |
| `src/hooks/useInterBankTransfer.ts` | Hook for inter-bank transfers |
| `src/components/accounting/InterBankTransferForm.tsx` | UI for fund transfers |
| `src/components/accounting/InterBankTransferList.tsx` | Transfer history view |
| `src/components/school/FuelExpenseForm.tsx` | Dedicated fuel expense entry |

#### Files to Update:

| File | Changes |
|------|---------|
| `src/components/school/SchoolBusFinanceSettings.tsx` | Add Fuel Bank Account mapping per branch |
| `src/hooks/useSchoolBusFinance.ts` | Add fuel_bank_account_id to settings interface |
| `src/components/accounting/BankingView.tsx` | Add Inter-Bank Transfer tab |
| `src/pages/Accounting.tsx` | Add Fund Transfer section |

---

### Part 5: Settings UI Updates

#### School Bus Finance Settings - New Section

```
+------------------------------------------------------------------+
|  FUEL EXPENSE GL ACCOUNT MAPPINGS                                 |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------+    +------------------------+         |
|  | Fuel Expense Account   |    | Fuel Bank Account      |         |
|  | [Fuel/Diesel Expense]  |    | [SBO Fuel Bank - BOC]  |         |
|  +------------------------+    +------------------------+         |
|                                                                   |
|  Branch-wise Fuel Bank Mapping:                                   |
|  +----------+-----------------------+--------+                    |
|  | Branch   | Fuel Bank Account     | Status |                    |
|  +----------+-----------------------+--------+                    |
|  | Nugegoda | BOC Fuel Account 001  |   ✓    |                    |
|  | LNU      | BOC Fuel Account 002  |   ✓    |                    |
|  | Kurunegala| Sampath Fuel Acct    |   ✓    |                    |
|  +----------+-----------------------+--------+                    |
|                                                                   |
|  [x] Auto-post fuel expenses to GL                                |
|  [x] Create AP Invoice for credit fuel purchases                  |
|                                                                   |
+------------------------------------------------------------------+
```

---

### Part 6: Inter-Bank Transfer UI

```
+------------------------------------------------------------------+
|  INTER-BANK FUND TRANSFER                                         |
+------------------------------------------------------------------+
|                                                                   |
|  Transfer Number: IBT-2026-0001 (auto-generated)                  |
|                                                                   |
|  +------------------------+    +------------------------+         |
|  | From Account           |    | To Account             |         |
|  | [Main Operating Bank]  |    | [Fuel Bank Account]    |         |
|  | Balance: Rs 2,500,000  |    | Balance: Rs 150,000    |         |
|  +------------------------+    +------------------------+         |
|                                                                   |
|  Amount: [___500,000___] LKR                                      |
|  Reference: [___FUEL-TOPUP-JAN___]                                |
|  Date: [___2026-02-06___]                                         |
|                                                                   |
|  GL Preview:                                                      |
|  +--------------------------------------------------------+      |
|  | DR: Fuel Bank Account (Asset)       Rs 500,000         |      |
|  | CR: Main Operating Bank (Asset)     Rs 500,000         |      |
|  +--------------------------------------------------------+      |
|                                                                   |
|                              [Cancel] [Process Transfer]          |
+------------------------------------------------------------------+
```

---

### Part 7: Fuel Expense Entry Flow

```
+------------------------------------------------------------------+
|  ADD FUEL EXPENSE - SCHOOL BUS OPERATIONS                         |
+------------------------------------------------------------------+
|                                                                   |
|  Branch: [v Nugegoda Branch         ]                             |
|  Bus (Optional): [v NC-1234 - Yutong]                             |
|                                                                   |
|  Expense Date: [2026-02-06]                                       |
|  Fuel Station/Vendor: [v CEYPETCO Nugegoda] or [Type new...]     |
|                                                                   |
|  Fuel Amount: [___25,000___] LKR                                  |
|  Liters (Optional): [___50___]                                    |
|  Bill/Receipt No: [___FUE-123456___]                              |
|                                                                   |
|  Payment Method:                                                  |
|  (•) Direct from Fuel Bank  ← Auto reduces fuel bank              |
|  ( ) Credit (Create AP Invoice)  ← Creates AP, pay later          |
|                                                                   |
|  [Upload Bill Image]                                              |
|                                                                   |
|  GL Preview (Auto-post enabled):                                  |
|  +--------------------------------------------------------+      |
|  | DR: Fuel Expense Account            Rs 25,000          |      |
|  | CR: Fuel Bank (Nugegoda)            Rs 25,000          |      |
|  +--------------------------------------------------------+      |
|                                                                   |
|                              [Cancel] [Save & Post to GL]         |
+------------------------------------------------------------------+
```

---

### Part 8: Implementation Sequence

#### Phase 1: Database & Settings (First)
| Step | Task | Files |
|------|------|-------|
| 1 | Add fuel_bank_account_id column to settings | SQL Migration |
| 2 | Create inter_bank_transfers table | SQL Migration |
| 3 | Update SchoolBusFinanceSettings UI | `SchoolBusFinanceSettings.tsx` |
| 4 | Update settings interface | `useSchoolBusFinance.ts` |

#### Phase 2: Fund Transfer System
| Step | Task | Files |
|------|------|-------|
| 5 | Create useInterBankTransfer hook | `useInterBankTransfer.ts` (new) |
| 6 | Create InterBankTransferForm | `InterBankTransferForm.tsx` (new) |
| 7 | Create InterBankTransferList | `InterBankTransferList.tsx` (new) |
| 8 | Add to Banking section | `BankingView.tsx` |

#### Phase 3: Fuel Expense Integration
| Step | Task | Files |
|------|------|-------|
| 9 | Create useFuelExpenseFinance hook | `useFuelExpenseFinance.ts` (new) |
| 10 | Create FuelExpenseForm | `FuelExpenseForm.tsx` (new) |
| 11 | Update ExpenseRequestForm for fuel | `ExpenseRequestForm.tsx` |
| 12 | Add GL auto-posting logic | `useFuelExpenseFinance.ts` |

#### Phase 4: Integration & Testing
| Step | Task | Files |
|------|------|-------|
| 13 | Add AP Invoice creation for credit fuel | Integration logic |
| 14 | Add bus_id tracking to journal lines | GL posting update |
| 15 | Test end-to-end flow | All components |

---

## Technical Details

### Hook: useFuelExpenseFinance.ts

```typescript
interface FuelExpenseForGL {
  expenseDate: string;
  branchId: string;
  busId?: string;
  amount: number;
  fuelLiters?: number;
  vendorId?: string;
  vendorName?: string;
  reference?: string;
  paymentMethod: 'direct' | 'credit';
}

export function usePostFuelExpenseToGL() {
  // 1. Get branch fuel bank account from settings
  // 2. Get fuel expense account from settings
  // 3. If direct payment:
  //    - Create JE: DR Fuel Expense / CR Fuel Bank
  //    - Update COA balances
  // 4. If credit:
  //    - Create AP Invoice
  //    - Create JE: DR Fuel Expense / CR Trade Payable
}
```

### Hook: useInterBankTransfer.ts

```typescript
interface InterBankTransferData {
  fromBankAccountId: string;
  toBankAccountId: string;
  amount: number;
  reference?: string;
  notes?: string;
}

export function useCreateInterBankTransfer() {
  // 1. Validate both banks have GL account mappings
  // 2. Create transfer record
  // 3. Create JE: DR To Bank / CR From Bank
  // 4. Update COA balances for both accounts
  // 5. Update bank_transactions for both accounts
}
```

---

## Expected Outcomes

After implementation:

1. **Branch-wise Fuel Bank Mapping** - Each branch can have its own fuel bank account
2. **Fund Transfers** - Easy transfer from main bank to fuel bank with auto GL posting
3. **Fuel Expense Recording** - Dedicated form with auto GL entries
4. **Real-time Balance Updates** - COA balances update immediately on transactions
5. **Complete Audit Trail** - Every fuel expense links to JE, bus, branch, and vendor
6. **AP Integration** - Credit fuel purchases create AP invoices for later payment
7. **Bus-level Tracking** - Fuel expenses can be tracked per bus for cost analysis

---

## Files Summary

### New Files (6)
```
src/hooks/useFuelExpenseFinance.ts
src/hooks/useInterBankTransfer.ts
src/components/accounting/InterBankTransferForm.tsx
src/components/accounting/InterBankTransferList.tsx
src/components/school/FuelExpenseForm.tsx
supabase/migrations/[timestamp]_fuel_bank_integration.sql
```

### Updated Files (5)
```
src/components/school/SchoolBusFinanceSettings.tsx
src/hooks/useSchoolBusFinance.ts
src/components/accounting/BankingView.tsx
src/pages/Accounting.tsx
src/components/accounting/ExpenseRequestForm.tsx
```

---

## User Actions Required

### After Implementation:
1. **Configure Fuel Bank Accounts** - Go to Settings → School Bus Finance → Add fuel bank accounts per branch
2. **Map GL Accounts** - Ensure fuel expense account and fuel bank COA accounts are mapped
3. **Create Bank Accounts** - Add fuel bank accounts in Banking → Bank Accounts with proper GL links
4. **Fund Transfer** - Use Inter-Bank Transfer to move funds from main bank to fuel bank
5. **Record Fuel Expenses** - Use the new fuel expense form for daily fuel purchases

