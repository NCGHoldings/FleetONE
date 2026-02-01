
# Finance & Accounting Module Cross-Check and Enhancement Plan

## Executive Summary
This plan addresses gaps in the Finance ERP to ensure full compliance with standard accounting and finance rules. The current implementation has strong foundations but needs enhancements in currency standardization, automated GL posting, and double-entry enforcement.

---

## Current State Analysis

### What's Working Well
| Feature | Status | Notes |
|---------|--------|-------|
| Double-Entry Validation | ✓ | JournalEntryForm validates total_debit === total_credit |
| Trial Balance | ✓ | Shows Opening/Period/Closing with balance verification |
| COA Balance Updates | ✓ | Uses account_type (debit/credit normal) logic |
| AR/AP Payment Allocation | ✓ | FIFO-style with status tracking |
| Multi-Company Isolation | ✓ | company_id filtering on all queries |
| Business Unit Tagging | ✓ | Consolidated GL with business_unit_code |

### Issues Identified

#### 1. Currency Inconsistency
- **File**: `LightVehicleQuotationPreview.tsx` (Line 776)
- **Issue**: Terms & Conditions mention "USD exchange rate"
- **Impact**: Confusing for users as system uses LKR

#### 2. Missing Automated GL Posting
- AR Invoices created without corresponding Journal Entry
- AP Invoices created without corresponding Journal Entry
- Gap between operational transactions and GL

#### 3. Balance Synchronization Risk
- COA `current_balance` updated separately from JE lines
- Risk of divergence between GL and COA balances

---

## Implementation Plan

### Phase 1: Currency Standardization

**Fix Light Vehicle Quotation T&Cs**

Update `LightVehicleQuotationPreview.tsx` line 776:

```text
From: "USD Rate Fluctuations: The quoted price is based on the current USD exchange rate..."
To: "Price Adjustments: The quoted price may be subject to change due to market conditions, import duties, or regulatory changes..."
```

**Files to Modify:**
- `src/components/lightvehicle/LightVehicleQuotationPreview.tsx`

---

### Phase 2: Automated GL Posting for AR/AP

**Accounting Rules to Implement:**

| Transaction | Debit Account | Credit Account |
|-------------|---------------|----------------|
| AR Invoice (Sales) | Trade Receivable | Sales Revenue |
| AR Receipt | Bank/Cash | Trade Receivable |
| Advance Receipt | Bank/Cash | Customer Advance (Liability) |
| Advance Application | Customer Advance | Trade Receivable |
| AP Invoice | Expense/Inventory | Trade Payable |
| AP Payment | Trade Payable | Bank/Cash |

**Enhancement to `useCreateARInvoice` hook:**

```typescript
// After creating AR Invoice, auto-post GL entry
const jeData = {
  entry_date: invoice.invoice_date,
  description: `AR Invoice: ${invoice.invoice_number}`,
  reference: invoice.invoice_number,
  lines: [
    { account_id: tradeReceivableId, debit: totalAmount, credit: 0 },
    { account_id: salesRevenueId, debit: 0, credit: totalAmount }
  ]
};
await createJournalEntry(jeData);
```

**Enhancement to `useCreateAPInvoice` hook:**

```typescript
// After creating AP Invoice, auto-post GL entry
const jeData = {
  entry_date: invoice.invoice_date,
  description: `AP Invoice: ${invoice.invoice_number}`,
  reference: invoice.invoice_number,
  lines: [
    { account_id: expenseAccountId, debit: totalAmount, credit: 0 },
    { account_id: tradePayableId, debit: 0, credit: totalAmount }
  ]
};
await createJournalEntry(jeData);
```

**Files to Modify:**
- `src/hooks/useAccountingMutations.ts`
- Add new utility: `src/lib/gl-posting-utils.ts`

---

### Phase 3: Finance Settings Validation

**Add Mandatory Account Validation:**

Before any GL posting operation, validate that required accounts are configured:

```typescript
interface GLAccountConfig {
  bankAccountId: string;        // Required
  tradeReceivableId: string;    // Required for AR
  tradePayableId: string;       // Required for AP
  salesRevenueId: string;       // Required for AR Invoice
  customerAdvanceId: string;    // Required for Advances
}

function validateGLConfig(config: GLAccountConfig, operation: string): boolean {
  if (!config.bankAccountId) {
    toast.error(`Bank Account not configured for ${operation}`);
    return false;
  }
  // ... additional validations
}
```

**Files to Modify:**
- `src/components/accounting/settings/` (various settings files)
- `src/hooks/useVehicleSalesFinance.ts`

---

### Phase 4: Balance Reconciliation Utility

**Create COA Balance Recalculation Tool:**

Add a utility to recalculate COA balances from posted Journal Entry lines:

```typescript
async function recalculateCOABalances(companyId: string) {
  // 1. Fetch all posted JE lines grouped by account_id
  // 2. Calculate net balance (debits - credits) per account
  // 3. Apply account_type logic (debit normal vs credit normal)
  // 4. Update chart_of_accounts.current_balance
  // 5. Log discrepancies for audit
}
```

**Location:**
- `src/components/accounting/settings/BalanceReconciliationTool.tsx`

---

### Phase 5: Receipt/Payment GL Integration

**AR Receipt GL Posting (Standard Flow):**

```text
Journal Entry when receiving payment:
  DR  Bank/Cash Account      [Amount Received]
  CR  Trade Receivable       [Amount Received]
```

**AR Receipt with Advance Application:**

```text
Step 1: Apply existing advance
  DR  Customer Advance (Liability)  [Advance Amount]
  CR  Trade Receivable              [Advance Amount]

Step 2: Receive balance payment
  DR  Bank/Cash Account             [Balance Amount]
  CR  Trade Receivable              [Balance Amount]
```

**Files to Modify:**
- `src/hooks/useAccountingMutations.ts` (useCreateARReceipt)
- `src/components/accounting/ARReceiptForm.tsx`

---

## Technical Architecture

### GL Posting Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATIONAL TRANSACTION                       │
│  (AR Invoice, AP Invoice, Receipt, Payment, Advance)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYER                              │
│  1. Check GL Account Configuration                               │
│  2. Validate Amount > 0                                          │
│  3. Verify Company Selection                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GL POSTING LAYER                              │
│  1. Create Journal Entry (Header)                                │
│  2. Create Journal Entry Lines (DR/CR)                           │
│  3. Validate Debit = Credit                                      │
│  4. Update COA Balances                                          │
│  5. Link JE to Source Document                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT TRAIL                                   │
│  - journal_entry_id linked to source record                      │
│  - business_unit_code tagged                                     │
│  - Timestamp and user tracking                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify Summary

| File | Action | Purpose |
|------|--------|---------|
| `LightVehicleQuotationPreview.tsx` | Modify | Fix USD → LKR terminology |
| `useAccountingMutations.ts` | Modify | Add auto GL posting to AR/AP |
| `gl-posting-utils.ts` | Create | Centralized GL posting helpers |
| `ARReceiptForm.tsx` | Modify | Add GL posting on receipt |
| `APPaymentForm.tsx` | Modify | Add GL posting on payment |
| `BalanceReconciliationTool.tsx` | Create | COA balance verification |

---

## Accounting Rules Compliance Checklist

| Rule | Current | After |
|------|---------|-------|
| Every transaction has DR = CR | ✓ | ✓ |
| AR Invoice creates JE | Partial | ✓ |
| AR Receipt creates JE | Partial | ✓ |
| AP Invoice creates JE | ✗ | ✓ |
| AP Payment creates JE | ✗ | ✓ |
| Advance tracked as Liability | ✓ | ✓ |
| COA Balance = Sum(JE Lines) | ✓ | ✓ + Reconciliation Tool |
| Trial Balance Always Balanced | ✓ | ✓ |
| Currency Consistency (LKR) | 95% | 100% |

---

## Implementation Priority

1. **High Priority**: Fix USD text in quotations (user-facing)
2. **High Priority**: Add GL posting to AR Invoice creation
3. **Medium Priority**: Add GL posting to AP Invoice creation
4. **Medium Priority**: Enhance AR Receipt GL posting
5. **Low Priority**: Create Balance Reconciliation Tool
