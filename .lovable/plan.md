
# Continue: Finish the 4 fixes (AR Receipt Employee, AP Voucher, Reports, Petty Cash)

Picking up from the last session. AR Employee selection UI + AP voucher placeholder fix + DB migration are already done. Three items remain.

## 1. AR Receipt — finish wiring Employee submit payload
**File:** `src/components/accounting/ARReceiptForm.tsx`

- On submit, when `partyType === 'employee'`:
  - Send `payee_employee_id` (the new column added in last migration) instead of `customer_id` / `vendor_id`.
  - Set `party_type = 'employee'` on the receipt row.
  - Skip invoice-allocation block entirely (direct amount only).
  - GL resolver already branches to `gl_settings.staff_advance_account_id` — confirm it's invoked.
- Validation: require either employee + amount, or customer/vendor + allocation.

No further DB change.

## 2. Petty Cash Fund — fix the create flow
**Files:** `src/components/accounting/petty-cash/PettyCashFundsTab.tsx`, `src/hooks/usePettyCash.ts`

Five concrete fixes:

1. **Company guard** — abort with toast `"Select a company before creating a fund"` when `selectedCompanyId` is null. Pass `company_id` into the insert payload (currently missing).
2. **Custodian = staff selector** — replace free-text input with a `Command`/`Popover` searchable list sourced from `staff_registry` (active only). Picking a staff fills `custodian_id` + `custodian_name`. Free-typing a new name auto-creates a `staff_registry` row (`is_active=true`, `staff_type='office'`, `salary_type='monthly'`, `monthly_salary=0`) — same auto-add pattern as the InlineCrewEditor we shipped earlier.
3. **Validation** — make `gl_account_id`, `custodian_name`, `fund_name`, `branch`, `initial_amount > 0` all required before the Create button enables.
4. **Error feedback** — wrap submit in try/catch; toast on `onError` with the actual error message so the dialog stops "doing nothing silently".
5. **Cache refresh** — on success, invalidate `["petty-cash-funds"]` AND `["petty-cash-dashboard"]`, then close dialog.

No DB change.

## 3. New Reports tab — Receipts & Payments Summary
**New file:** `src/components/accounting/reports/ReceiptsPaymentsSummaryView.tsx`
**Wire-up:** `src/pages/Accounting.tsx` Reports module — add tab between `audit` and `report-builder`.

**Layout (CEO-presentation grade, Corporate Navy):**

```text
┌─ Filters: [Date Range] [Business Unit] [Export PDF] [Export Excel] ─┐
├─ KPI ROW ─────────────────────────────────────────────────────────┤
│ Total Receipts │ Total Payments │ Net Cash │ Receipt:Payment Ratio │
├─ Two-column body ─────────────────────────────────────────────────┤
│  CUSTOMERS (sortable list)     │  PREVIEW PANE (right)            │
│  ─ row click selects ─        │  Header: name, code, balance     │
│  Customer A  Rs xxx,xxx       │  ▾ Receipt RCT-001  Rs 50,000    │
│  Customer B  Rs xxx,xxx       │     ┌─ Allocations ─────────┐    │
│  ...                          │     │ INV-x  Rs 30,000      │    │
│                               │     │ INV-y  Rs 20,000      │    │
│  ──────────────                │     └────────────────────────┘    │
│  VENDORS (sortable list)      │  ▾ Receipt RCT-002 ...           │
│  Vendor X  Rs xxx,xxx         │                                  │
│  ...                          │  Totals at bottom                │
└──────────────────────────────────────────────────────────────────┘
```

**Data joins (existing tables, no new ones):**
- Customers panel: `ar_receipts` + `ar_receipt_allocations` + `ar_invoices(invoice_number, invoice_date)` + `customers(customer_code, customer_name, current_balance)`.
- Vendors panel: `ap_payments` + `ap_payment_allocations` + `ap_invoices(invoice_number, invoice_date)` + `vendors(vendor_code, vendor_name, current_balance)`. For `is_direct_payment = true` rows, expand `ap_payment_lines` instead of allocations.
- Filtered by `business_unit_code` and `payment_date / receipt_date` in the picked range.
- Default range: current month. All money via `<CurrencyDisplay>` (LKR, `Rs 1,000,000` format).

**Export:**
- Excel: `exportToExcel` util — one sheet per party (Customer Receipts, Vendor Payments, Allocation Detail).
- PDF: existing `sectionBasedPDF` from `src/lib/pdf-multi-page.ts` — adds `data-pdf-page` markers on each customer/vendor card so multi-page works automatically.

## Files touched (this round)

| File | Change |
|---|---|
| `src/components/accounting/ARReceiptForm.tsx` | Finish employee submit payload + skip allocations branch |
| `src/components/accounting/petty-cash/PettyCashFundsTab.tsx` | Staff combobox custodian, company guard, stricter validation, error toasts |
| `src/hooks/usePettyCash.ts` | Auto-create staff on free-typed custodian; invalidate dashboard query on create success |
| `src/components/accounting/reports/ReceiptsPaymentsSummaryView.tsx` | **new** — full summary view with party preview pane |
| `src/pages/Accounting.tsx` | Register new "Receipts & Payments" Reports tab |

## Out of scope
- AP Payment **form** does not get an employee picker yet (voucher rendering already handles `payee_type='customer'`).
- Reprinting historical AP vouchers — fix applies on next preview only.
- No new report templates beyond Receipts & Payments Summary.
- TEST environment untouched.
