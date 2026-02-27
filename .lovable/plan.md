
# Build All Missing Development Items

This plan covers the 2 incomplete requirements from the cross-check plus all missing reconciliation worksheet components from the approved reconciliation plan.

---

## Part A: Requirement #1 -- Bank Account Edit Functionality

Currently `BankAccountForm.tsx` only creates bank accounts. No edit capability exists.

### Changes:
1. **Modify `BankAccountForm.tsx`** to accept an optional `bankAccount` prop for editing
   - Add `bankAccount?: any` to `BankAccountFormProps`
   - Pre-populate form with existing data when editing
   - Change dialog title to "Edit Bank Account" when editing
   - Change submit button text to "Update Bank Account"

2. **Create `useUpdateBankAccount` mutation** in `useAccountingMutations.ts`
   - Uses `supabase.from("bank_accounts").update({...}).eq("id", id)`
   - Invalidates `["bank-accounts"]` query key

3. **Add Edit button to `BankingView.tsx`** bank accounts table
   - Add a new column with a pencil icon edit action
   - State for `editingBankAccount` 
   - Pass selected bank account to `BankAccountForm`

---

## Part B: Requirement #4 -- Vendor Bank Details

The `vendors` table already has `bank_name`, `bank_branch`, `bank_account` columns but the `VendorForm.tsx` has no UI fields for them.

### Changes:
1. **Modify `VendorForm.tsx`**:
   - Add `bank_name`, `bank_branch`, `bank_account` fields to the Zod schema (all optional strings)
   - Add a "Banking Details" section in the form UI (below WHT section) with 3 fields: Bank Name, Branch, Account Number
   - Include these fields in the submit payload
   - Map existing vendor data to defaults when editing

---

## Part C: AR Reconciliation Worksheet (SAP B1-Style Upgrade)

Replace basic `ARReconciliationView.tsx` with a full SAP B1-style worksheet.

### New file: `ARReconciliationWorksheet.tsx`
- **Header bar**: Customer selector, period date range, customer statement balance input, display filter (All/Unmatched/Matched)
- **Table**: List AR invoices and receipts chronologically with columns: #, Cleared checkbox, Type (INV/RCT/CN), Date, Doc No., Reference, Debit, Credit, Cleared Amount input, Remarks
- **Summary footer**: Left side shows invoice/receipt counts and totals. Right side shows Book Balance, Customer Statement Balance, Difference (green checkmark when zero)
- **Actions**: Cancel and Save Reconciliation
- **Uses shared CSS** from `ReconciliationWorksheet.css`
- Follows exact same architecture as `BankReconciliationWorksheet.tsx`

### Wire in `Accounting.tsx`:
- Replace `ARReconciliationView` import with `ARReconciliationWorksheet`

---

## Part D: AP Reconciliation Worksheet (SAP B1-Style Upgrade)

Replace basic `APReconciliationView.tsx` with full SAP B1-style worksheet.

### New file: `APReconciliationWorksheet.tsx`
- Same pattern as AR but for vendors
- **Header**: Vendor selector, period range, vendor statement balance, display filter
- **Table**: AP invoices (debits), AP payments (credits) with clearing checkboxes
- **Summary footer**: Invoice/Payment totals on left, Book Balance vs Vendor Statement vs Difference on right
- Follows same architecture as Bank Reconciliation Worksheet

### Wire in `Accounting.tsx`:
- Replace `APReconciliationView` import with `APReconciliationWorksheet`

---

## Part E: Petty Cash Reconciliation Worksheet

### New file: `PettyCashReconciliationWorksheet.tsx`
- **Header**: Fund selector (from `petty_cash_funds`), reconciliation date, physical cash count input
- **Table**: All petty cash transactions with clearing checkboxes, showing running balance
- **Summary footer**: Total disbursements, total replenishments, system balance, physical count, difference
- **Actions**: Save reconciliation (inserts into `petty_cash_reconciliations` table)

### Wire in `Accounting.tsx`:
- Add "Petty Cash Reconciliation" tab in the banking module tabs

---

## Part F: Sub-Ledger to GL Reconciliation

### New file: `SubLedgerReconciliationView.tsx`
- **Header**: Reconciliation type selector (AR Sub-Ledger / AP Sub-Ledger), as-of date
- **Table**: Each customer/vendor with sub-ledger balance alongside GL control account balance
- **Summary**: Total sub-ledger balance, GL control account balance, difference
- Fetches AR invoice balances summed by customer and compares against Trade Receivable GL account balance

### Wire in `Accounting.tsx`:
- Add in GL/Settings section

---

## Part G: Intercompany Reconciliation

### New file: `IntercompanyReconciliationView.tsx`
- **Header**: Select two business units, reconciliation date
- **Table**: Intercompany transactions between units with clearing checkboxes
- **Summary**: Unit A balance, Unit B balance, net difference

### Wire in `Accounting.tsx`:
- Add in GL section

---

## Part H: Shared Reconciliation CSS

### New file: `ReconciliationWorksheet.css`
- Extract and extend bank reconciliation CSS into shared stylesheet
- Module-specific color accents: blue (bank), green (AR), orange (AP), purple (petty cash)
- All new worksheet components import this shared CSS

---

## Technical Summary

| File | Action |
|------|--------|
| `BankAccountForm.tsx` | Modified -- add edit mode |
| `BankingView.tsx` | Modified -- add edit button to table |
| `useAccountingMutations.ts` | Modified -- add `useUpdateBankAccount` |
| `VendorForm.tsx` | Modified -- add banking details fields |
| `ARReconciliationWorksheet.tsx` | New -- SAP B1-style AR worksheet |
| `APReconciliationWorksheet.tsx` | New -- SAP B1-style AP worksheet |
| `PettyCashReconciliationWorksheet.tsx` | New -- Petty cash worksheet |
| `SubLedgerReconciliationView.tsx` | New -- Sub-ledger vs GL comparison |
| `IntercompanyReconciliationView.tsx` | New -- Cross-unit reconciliation |
| `ReconciliationWorksheet.css` | New -- Shared CSS for all worksheets |
| `Accounting.tsx` | Modified -- wire new components, add new tabs |
