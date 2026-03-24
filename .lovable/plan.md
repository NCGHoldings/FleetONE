

# Yutong Invoice System Enhancement — Proforma Amount Flexibility, Numbering, Tax GL Separation, and AR Auto-Creation

## What the User Wants

1. **Proforma invoice amount flexibility**: Allow amounts **higher than the actual bus value** (not just percentages). Add a fixed-amount input option alongside percentage. Show a breakdown of **customer commitment** vs **leasing company amount**.

2. **Better invoice numbering**: Proforma invoices should include "PI" in the number (e.g., `NCGH-YT-PI-260001`). Customer invoices and Tax invoices should have distinct prefixes too (e.g., `CI`, `TI`).

3. **Tax invoice and customer invoice VAT separation**: Both should calculate VAT separately (Total / 1.18 = product value, remainder = tax). Tax amounts should hit separate GL accounts (VAT Output) and COA correctly.

4. **Auto AR invoice on invoice generation** (not just on approval): When any invoice type is generated, auto-create an AR invoice. The AR invoice reference should show the correct invoice number. GL entries should reference the correct document.

---

## Implementation Plan

### 1. Enhanced Proforma Amount Options in `YutongInvoiceTypeModal.tsx`

**Current**: Only percentage slider (10-100% of total amount).
**New**:
- Add toggle: "Percentage" vs "Fixed Amount" mode
- In Fixed Amount mode: show an editable input for the proforma amount (allow values > totalAmount)
- Slider max changes to 150% (or uncapped in fixed mode)
- New section below amount: **"Amount Breakdown"**
  - "Customer Commitment" input (editable, defaults to `totalAmount - proformaAmount`)
  - "Leasing Company Amount" = proformaAmount (shown)
  - If proforma > totalAmount, show label: "Declared Vehicle Value: LKR X"
- Update `ProformaInvoiceConfig` interface to include `amountMode: 'percentage' | 'fixed'` and `declaredVehicleValue`

### 2. Invoice Numbering with Type Prefixes

**File**: New migration + update `generate_yutong_invoice_no` RPC or handle in JS.

Since the DB function `generate_yutong_invoice_no()` generates a single sequence, the cleanest approach:
- Modify `useYutongOrderInvoiceManagement.ts` to **prefix the generated number** based on invoice category:
  - `proforma_invoice` → insert `PI-` after `NCGH-YT-` → `NCGH-YT-PI-260001`
  - `direct_invoice` → insert `CI-` → `NCGH-YT-CI-260002`
  - `tax_invoice` → insert `TI-` → `NCGH-YT-TI-260003`
- Apply in `generateAndStoreDraftInvoice` after the RPC call, before saving

### 3. Tax/VAT Separation in GL Posting

**Current**: `postVehicleInvoiceToGL` posts full amount as `DR Trade Receivable | CR Sales Revenue` — no VAT separation.

**New** (in `useVehicleSalesFinance.ts` → `postVehicleInvoiceToGL`):
- Accept new optional params: `isTaxInvoice`, `taxRate`, `baseAmount`, `vatAmount`
- When tax invoice or customer invoice with VAT:
  - DR Trade Receivable: full amount (totalAmount)
  - CR Sales Revenue: baseAmount (totalAmount / 1.18)
  - CR VAT Output: vatAmount (totalAmount - baseAmount)
- Use `settings.vat_output_account_id` for VAT Output GL account
- For customer invoices: same logic (Total / 1.18 split)

**Also update** `createVehicleARInvoice` to store `tax_amount` and `base_amount` fields in `ar_invoices` if the table supports it, or in `notes`.

### 4. Auto AR Invoice at Generation (Not Just Approval)

**Current**: AR invoice + GL posting only happens in `approveInvoice()`.

**New flow**:
- Move AR invoice creation to `generateAndStoreDraftInvoice()` — create AR invoice in "draft" status immediately
- On `approveInvoice()`:
  - Update existing AR invoice status to "approved" / "unpaid"
  - Post GL entries (revenue recognition + VAT separation)
  - Apply advances
- AR invoice `reference` field should use the **system invoice number** (e.g., `NCGH-YT-PI-260001`) not the order number
- GL entry `reference` should also use the invoice number for traceability

### 5. GL Document View Link

- In GL journal entry list/drill-down, when `source_module = 'yutong_sales'` and reference contains an invoice number, add a "View Document" link that opens the invoice PDF
- This requires storing `invoice_record_id` in the journal entry (add to `notes` or a metadata field)

---

## Files to Change

| File | Changes |
|------|---------|
| `src/components/yutong/YutongInvoiceTypeModal.tsx` | Add fixed amount mode, amount > total, customer commitment vs leasing breakdown |
| `src/hooks/useYutongOrderInvoiceManagement.ts` | Add type prefix to invoice numbers, move AR creation to generation, update approval to update AR, pass tax params to GL |
| `src/hooks/useVehicleSalesFinance.ts` | Add VAT separation in `postVehicleInvoiceToGL`, update `createVehicleARInvoice` to accept invoice number reference |
| `src/lib/yutong-order-invoice-generator.ts` | Update `YutongOrderInvoiceData` interface for new fields |
| `src/components/yutong/YutongOrderInvoiceGenerator.tsx` | Pass new config fields through to invoice generation |

## Migration Needed
- None strictly required if we handle number prefixing in JS. But if `ar_invoices` needs `base_amount`/`vat_amount` columns, a migration would be needed.

---

## Summary
This enhancement makes the Yutong invoice system production-grade with:
- Flexible proforma amounts (fixed or %, can exceed bus value)
- Clear numbering (PI/CI/TI prefixes)
- Proper VAT accounting (separate GL lines for tax)
- Immediate AR invoice creation on generation
- Invoice number as GL reference for audit trail

