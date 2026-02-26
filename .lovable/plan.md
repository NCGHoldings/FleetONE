
# Comprehensive Reconciliation Module Upgrade

Upgrade all existing reconciliation views to match the SAP B1-style Bank Reconciliation Worksheet, and add new reconciliation modules that are currently missing.

---

## Current State

| Module | Status | Quality |
|--------|--------|---------|
| Bank Reconciliation | Exists | SAP B1-style worksheet (gold standard) |
| AR Reconciliation | Exists | Basic -- uses `prompt()` for balance, no clearing workflow |
| AP Reconciliation | Exists | Basic -- same issues as AR |
| Stock Reconciliation | Exists | Basic -- physical count entry only |
| GL Balance Reconciliation | Exists | Admin tool only, no worksheet |
| Petty Cash Reconciliation | Missing | No reconciliation view |
| Intercompany Reconciliation | Missing | No module exists |
| Sub-Ledger to GL Reconciliation | Missing | No module exists |

---

## Phase 1: Upgrade AR Reconciliation to SAP B1-Style Worksheet

**File:** `src/components/accounting/ARReconciliationWorksheet.tsx` (new, replaces ARReconciliationView)

Build a worksheet matching the bank reconciliation pattern:
- **Header bar:** Customer selector, period date range, customer statement balance input, display filter (All / Unmatched / Matched)
- **Table:** List all AR invoices and receipts in chronological order with columns: #, Cleared checkbox, Type (INV/RCT/CN), Date, Doc No., Reference, Debit (invoices), Credit (receipts/credit notes), Cleared Amount input, Remarks
- **Summary footer (SAP-style):** Left side shows Invoice count/total and Receipt count/total. Right side shows Book Balance, Customer Statement Balance, and Difference (with green checkmark when zero)
- **Actions:** Cancel, Save Reconciliation (creates record in `ar_reconciliations` and marks matched items)
- **CSS:** Reuse `BankReconciliationWorksheet.css` classes with minor color adjustments

**Database:** Uses existing `ar_reconciliations` table -- no schema changes needed.

---

## Phase 2: Upgrade AP Reconciliation to SAP B1-Style Worksheet

**File:** `src/components/accounting/APReconciliationWorksheet.tsx` (new, replaces APReconciliationView)

Same pattern as AR but for vendors:
- **Header:** Vendor selector, period range, vendor statement balance, display filter
- **Table:** AP invoices (debits), AP payments (credits), debit notes in chronological order with clearing checkboxes
- **Summary footer:** Invoice/Payment totals on left, Book Balance vs Vendor Statement vs Difference on right
- **Actions:** Save creates record in `ap_reconciliations`

**Database:** Uses existing `ap_reconciliations` table -- no schema changes needed.

---

## Phase 3: Petty Cash Reconciliation Worksheet

**File:** `src/components/accounting/PettyCashReconciliationWorksheet.tsx` (new)

SAP B1-style worksheet for reconciling physical petty cash count against system balance:
- **Header:** Fund selector (from `petty_cash_funds`), reconciliation date, physical cash count input
- **Table:** All petty cash transactions (disbursements/replenishments) with clearing checkboxes, showing running balance
- **Summary footer:** Total disbursements, total replenishments, system balance, physical count, difference
- **Actions:** Save reconciliation

**Database migration:** Create `petty_cash_reconciliations` table:
- id, fund_id, reconciliation_date, system_balance, physical_count, difference, status, notes, reconciled_by, company_id, created_at

---

## Phase 4: Sub-Ledger to GL Reconciliation Worksheet

**File:** `src/components/accounting/SubLedgerReconciliationView.tsx` (new)

Reconciles AR/AP sub-ledger totals against their GL control accounts:
- **Header:** Reconciliation type selector (AR Sub-Ledger, AP Sub-Ledger), as-of date
- **Table:** Shows each customer/vendor with their sub-ledger balance alongside the GL control account balance
- **Summary:** Total sub-ledger balance, GL control account balance, difference
- Automatically fetches AR invoice balances summed by customer and compares against the Trade Receivable GL account balance (and similarly for AP/Trade Payable)

**Database migration:** Create `subledger_reconciliations` table:
- id, reconciliation_type (ar/ap), reconciliation_date, subledger_total, gl_balance, difference, status, notes, company_id, created_at

---

## Phase 5: Intercompany Reconciliation Worksheet

**File:** `src/components/accounting/IntercompanyReconciliationView.tsx` (new)

Reconciles balances between NCG Holding sub-units:
- **Header:** Select two business units (e.g., YUT vs SBO), reconciliation date
- **Table:** Shows intercompany transactions between the two units with clearing checkboxes
- **Summary:** Unit A balance, Unit B balance, net difference

**Database migration:** Create `intercompany_reconciliations` table:
- id, unit_a_code, unit_b_code, reconciliation_date, unit_a_balance, unit_b_balance, difference, status, notes, company_id, created_at

---

## Phase 6: Wire Into Accounting Page

**File:** `src/pages/Accounting.tsx`

- Replace `ARReconciliationView` import with `ARReconciliationWorksheet`
- Replace `APReconciliationView` import with `APReconciliationWorksheet`
- Add "Petty Cash Reconciliation" tab under Banking section
- Add "Sub-Ledger Reconciliation" tab under Settings or GL section
- Add "Intercompany Reconciliation" tab under GL section

---

## Phase 7: Shared Reconciliation CSS

**File:** `src/components/accounting/ReconciliationWorksheet.css` (new)

Extract and extend the bank reconciliation CSS into a shared stylesheet that all worksheet components can import, with module-specific color accents (blue for bank, green for AR, orange for AP, purple for petty cash).

---

## Technical Summary

| File | Action |
|------|--------|
| `ARReconciliationWorksheet.tsx` | New -- SAP B1-style AR worksheet |
| `APReconciliationWorksheet.tsx` | New -- SAP B1-style AP worksheet |
| `PettyCashReconciliationWorksheet.tsx` | New -- Petty cash physical count worksheet |
| `SubLedgerReconciliationView.tsx` | New -- Sub-ledger vs GL comparison |
| `IntercompanyReconciliationView.tsx` | New -- Cross-unit balance reconciliation |
| `ReconciliationWorksheet.css` | New -- Shared CSS for all worksheets |
| `Accounting.tsx` | Modified -- Wire new components into tabs |
| Database migration | New tables: `petty_cash_reconciliations`, `subledger_reconciliations`, `intercompany_reconciliations` |

All new components follow the exact same architecture pattern as `BankReconciliationWorksheet.tsx`: useState for cleared state, useMemo for summary calculations, useCallback for handlers, SAP-style header/table/footer layout with the shared CSS.
