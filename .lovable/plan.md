

# Yutong Sales: Complete Finance & Double-Entry Flow Diagram

I've traced the entire Yutong financial flow through the codebase. Here's a comprehensive diagram covering every journal entry, double entry, and integration point.

## What the diagram will show

```text
COMPLETE YUTONG FINANCE FLOW
=============================

STAGE 1: QUOTATION → ORDER
  - Quotation created (no finance impact)
  - Order created from quotation (no JE yet)
  - Finance Customer auto-created/linked in `customers` table

STAGE 2: PAYMENT RECEIVED (Advance)
  Journal Entry: YUT-ADV-{orderNo}
  ┌─────────────────────────────────────────┐
  │  DR  Bank Account              XX,XXX   │
  │  CR  Customer Advance (Liability) XX,XXX│
  └─────────────────────────────────────────┘
  + AR Receipt created in ar_receipts
  + Payment linked: yutong_customer_payments.journal_entry_id
  + COA balances updated

STAGE 3: INVOICE GENERATION (Draft)
  - Proforma (PI-): NO AR, NO JE (bank/leasing reference only)
  - Customer (CI-) or Tax (TI-):
    → Draft AR Invoice created in ar_invoices (status='draft')
    → NO GL posting yet (draft = not in ledger)
    → PDF stored in yutong-invoices bucket
    → Records in yutong_invoice_records + yutong_invoice_documents

STAGE 4: INVOICE APPROVAL
  Step A — AR Invoice updated: draft → unpaid/partial/paid
  Step B — Revenue Recognition GL (if no JE already exists):
  ┌──────────────────────────────────────────────────────┐
  │  DR  Trade Receivable              XX,XXX            │
  │  CR  Sales Revenue (excl VAT)      XX,XXX / 1.18     │
  │  CR  VAT Output (18%)             VAT amount         │
  └──────────────────────────────────────────────────────┘
  (Non-tax invoice: CR Sales Revenue = full amount, no VAT split)

  Step C — Advance Application (if totalPaid > 0):
  ┌─────────────────────────────────────────┐
  │  DR  Customer Advance       XX,XXX      │
  │  CR  Trade Receivable       XX,XXX      │
  └─────────────────────────────────────────┘
  This clears the advance liability against the receivable.

STAGE 5: BALANCE PAYMENT
  Journal Entry: YUT-BAL-{orderNo}
  ┌─────────────────────────────────────────┐
  │  DR  Bank Account              XX,XXX   │
  │  CR  Trade Receivable          XX,XXX   │
  └─────────────────────────────────────────┘
  + AR Receipt created + allocated to AR Invoice
  + AR Invoice paid_amount updated, status → 'paid'

STAGE 6: FULL PAYMENT (single payment, no advance)
  Journal Entry: YUT-REV-{orderNo}
  ┌─────────────────────────────────────────┐
  │  DR  Bank Account              XX,XXX   │
  │  CR  Sales Revenue             XX,XXX   │
  └─────────────────────────────────────────┘

GL ACCOUNT RESOLUTION (4-Tier Hierarchy):
  1. Item Category (item_categories.sales_account_id for "Yutong Sales")
  2. Customer Category (customer_categories mapping)
  3. Customer Direct (customer.ar_account_id)
  4. Global Settings (yutong_finance_settings fallback)

TABLES INVOLVED:
  Operations:  yutong_quotations → yutong_orders → yutong_customer_payments
  Documents:   yutong_invoice_records → yutong_invoice_documents
  Finance:     customers → ar_invoices → ar_receipts → ar_receipt_allocations
  Accounting:  journal_entries → journal_entry_lines → chart_of_accounts
  Config:      yutong_finance_settings, gl_settings
  LC/DO:       yutong_letter_of_credits → yutong_delivery_orders
```

## Deliverable

I will generate a Mermaid diagram file showing all these flows visually — every stage, every journal entry with DR/CR, every table connection, and the GL account resolution hierarchy. This will be saved as a `.mmd` file you can view and reference.

## Technical details

- Source files traced: `useVehicleSalesFinance.ts` (992 lines), `useYutongOrderInvoiceManagement.ts` (758 lines), `useYutongFinanceManagement.ts` (381 lines)
- All journal entries use `source_module: 'yutong_sales'` and `business_unit_code: 'YUT'`
- Double-posting guards exist: checks `ar_invoices.journal_entry_id` before approval GL
- Proforma invoices are explicitly excluded from all AR/JE creation

