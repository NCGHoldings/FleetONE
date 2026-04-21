

# Fix 4 issues: AR Receipt Employee group, AP Payment customer payee on voucher, Reports summary page, Petty Cash create

## 1. AR Receipt — Add "Employee" party group (next to Customers + Vendors)

**Where:** `src/components/accounting/ARReceiptForm.tsx`

**Today:** Party selector groups by Customers (🟢) and Vendors (🔵) only. There is no way to record a receipt from a staff member (e.g. IOU return, salary advance recovery, fuel float refund).

**Fix:**
- Add a third party type `"employee"` populated from `staff_registry` (filter `is_active = true`).
- Add a new grouped section in the popover: `🟡 Employees` grouped by `staff_type` (Driver / Conductor / Office / Mechanic etc.).
- When an employee is selected, GL resolution falls back to the **Staff Advance / IOU receivable** GL account (from `gl_settings.staff_advance_account_id`, with category override allowed).
- Receipt save persists `party_type='employee'` and stores employee id in `payee_employee_id` (new nullable column on `ar_receipts` referencing `staff_registry`).
- No invoice allocation table is shown for employees — direct amount entry only (same UI path used today for vendors).

**Migration:** add `payee_employee_id uuid` column on `ar_receipts` referencing `staff_registry(id)`, nullable, indexed; RLS unchanged.

---

## 2. AP Payment Voucher PDF — show customer details when payee is a customer

**Where:** `src/lib/document-template-utils.ts` (case `ap_payment_voucher`, lines 417–512) + `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`.

**Today:** All payee placeholders (`{{vendor_name}}`, `{{payee_name}}`, `{{vendor_address}}`, bank, contact, currency) read **only** from `documentData.vendors`. When `payee_type = 'customer'` the payment row joins `customers` instead, so the printed voucher shows blank payee, blank address, blank bank.

**Fix:**
- In `ap_payment_voucher` template-mapping, branch on `documentData.payee_type`:
  - When `'customer'`, map `payee_name`, `vendor_name`, `payee_account`, `payee_bank`, `vendor_email`, `vendor_phone`, `vendor_contact`, `vendor_bank_*`, `currency` from `documentData.customers` (already joined via `ap_payments_payee_customer_id_fkey` in `useAccountingData.ts:560`).
  - When `'employee'` (after fix #1 spreads to AP too — out of scope here), fall back to `documentData.employees`.
  - Default to `vendors.*` as today.
- Add a small "Paid To: Customer / Vendor / Employee" badge line in the printed voucher (visible in HTML template via new `{{payee_type_label}}` placeholder).

No DB change needed — the join already exists, only the placeholder mapping is wrong.

---

## 3. Reports — new "Receipts & Payments Summary" tab

**Where:** new file `src/components/accounting/reports/ReceiptsPaymentsSummaryView.tsx`, registered as a new tab in `src/pages/Accounting.tsx` Reports module (between `audit` and `report-builder`).

**What it does:**
- Date-range picker (defaults: current month) + optional Company / Business Unit filter.
- 4 KPI cards on top: Total Receipts, Total Payments, Net Cash Movement, Receipt-to-Payment Ratio.
- Two side-by-side panels:
  - **Customers** panel — list every customer that has at least one receipt in the period, sorted by total received desc. Each row clickable / expandable.
  - **Vendors** panel — same for AP payments.
- On click of a customer row → right-side preview pane shows:
  - Customer header (code, name, contact, current balance).
  - Per-receipt cards (receipt #, date, method, amount).
  - **Inside each receipt card**, a nested allocations table: invoice #, invoice date, allocated amount, write-off, balance after — driven by `ar_receipt_allocations` join.
  - Totals row at the bottom of the customer pane.
- Same behavior on vendor row → AP payments + `ap_payment_allocations` breakdown (or direct-payment line items if `is_direct_payment`).
- Top-right "Export PDF" + "Export Excel" buttons (re-uses existing `exportToExcel` and the html-to-pdf canvas pipeline already used by FinanceDocumentPreviewModal).

**Data sources (no new tables):**
- `ar_receipts` + `ar_receipt_allocations` + `ar_invoices` (joins already in place).
- `ap_payments` + `ap_payment_allocations` + `ap_invoices` + `ap_payment_lines` (for direct payments).
- All filtered by `business_unit_code` and date range.

**Visual style:** matches existing CEO-presentation grade (Corporate Navy `#1e3a5f`, mono/tabular numbers via `CurrencyDisplay`, subtle row hover, sticky headers).

---

## 4. Petty Cash Fund — fix create flow

**Where:** `src/components/accounting/petty-cash/PettyCashFundsTab.tsx` + `src/hooks/usePettyCash.ts` (`useCreatePettyCashFund`).

**Issues found:**
1. `selectedCompanyId` from `useCompany()` may be `null` for users on the holding view — insert silently fails the company FK because the form passes nothing for `company_id` validation. Add a preflight check that aborts with a clear toast: *"Select a company before creating a fund"*.
2. `custodian_name` is a free-text input but the schema also has `custodian_id → staff_registry`. Convert the field to a **searchable staff selector** (mirrors `IOUManagementView.tsx:53` query) — picking a staff fills both `custodian_id` and `custodian_name`, free-typing fills only `custodian_name` and creates a staff row `is_active=true` (auto-add pattern, matching the DriverConductor inline editor we just shipped).
3. Validation gate is too loose: the Create button stays enabled even when `gl_account_id` is empty, but the GL posting step in `useCreatePettyCashTransaction` later breaks. Add `gl_account_id` to required fields.
4. Add try/catch + toast at form-submit so the dialog doesn't appear to "do nothing" on a silent error (today the mutation only logs to `onError`, the dialog stays open without feedback).
5. After create, refresh both `petty-cash-funds` and `petty-cash-dashboard` queries and close the dialog only on success.

**No migration required** — schema already supports everything.

---

## Files touched

| File | Change |
|---|---|
| `src/components/accounting/ARReceiptForm.tsx` | Add Employee party group, GL resolver branch, payload field |
| `src/hooks/useAccountingData.ts` | Add `staff_registry` employees fetcher used by ARReceipt and AP voucher rendering |
| `src/hooks/useAccountingMutations.ts` | Persist `payee_employee_id` for AR receipts |
| `src/lib/document-template-utils.ts` | Branch `ap_payment_voucher` placeholder mapping on `payee_type` |
| `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx` | Pass `customers` / `employees` joined data through to placeholder builder |
| `src/components/accounting/reports/ReceiptsPaymentsSummaryView.tsx` | **new** — full summary view |
| `src/pages/Accounting.tsx` | Register new "Receipts & Payments" Reports tab |
| `src/components/accounting/petty-cash/PettyCashFundsTab.tsx` | Custodian = staff selector + `gl_account_id` required + better toasts + company guard |
| `src/hooks/usePettyCash.ts` | Auto-create staff on free-typed custodian, stricter create validation, invalidate dashboard query |

## Migration

```sql
alter table public.ar_receipts add column if not exists payee_employee_id uuid references public.staff_registry(id);
create index if not exists idx_ar_receipts_payee_employee_id on public.ar_receipts(payee_employee_id);
```
RLS on `ar_receipts` is unchanged (existing policies cover all columns).

## Out of scope
- Changing the AP Payment **form** to support employees (only AR side gets Employee in this round; the AP voucher fix is rendering-only for the existing customer payee type).
- Re-printing historical vouchers — fix applies on next preview/print.
- New report templates beyond Receipts & Payments Summary.

